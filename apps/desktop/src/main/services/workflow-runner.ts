/**
 * Workflow durable run：后台推进、恢复、暂停、取消、重试。
 * IPC 立即返回；进度靠 workflow.* 事件与 renderer 轮询。
 */
import {
  deleteRunStepsFrom,
  getRun,
  insertRun,
  insertRunStep,
  listRunSteps,
  listRuns,
  updateRun
} from "@enjoy-agents/db"
import { runDurableWorkflow, type WorkflowCheckpoint } from "@enjoy-agents/agent-core"
import { abortAgent } from "./agent-runner"
import { getDatabase } from "./database"
import { stampAndBroadcast } from "./event-bus"
import { createId } from "./ids"
import { readPreferences } from "./preferences"
import { runWorkflowAgentStep } from "./workflow-step-agent"

export function listWorkflows(filter: { workspaceId?: string; sessionId?: string }) {
  return listRuns(getDatabase(), { ...filter, kind: "workflow" }).map((row) => getWorkflow(row.id))
}

export function getWorkflow(runId: string) {
  const row = getRun(getDatabase(), runId)
  if (!row) throw new Error("Workflow not found.")
  const drafts = parseCheckpoint(row.checkpoint).steps ?? DEFAULT_STEPS
  const persisted = listRunSteps(getDatabase(), runId)
  const steps = drafts.map((draft, index) => {
    const saved = persisted.find((step) => step.idx === index || step.label === draft.label)
    return {
      id: draft.id,
      index,
      label: draft.label,
      status: saved?.status ?? "paused",
      dependsOn: draft.dependsOn ?? [],
      checkpointId: saved?.checkpointId ?? undefined
    }
  })
  return { ...toPublic(row), steps }
}

const DEFAULT_STEPS = [
  { id: "plan", label: "Plan", dependsOn: [] as string[] },
  { id: "act", label: "Act", dependsOn: ["plan"] },
  { id: "verify", label: "Verify", dependsOn: ["act"] }
]

const CANCEL_SENTINEL = "WORKFLOW_CANCELLED"

/** 正在后台推进的 workflow runId；防重复 resume。 */
const activeWorkflowRuns = new Set<string>()
/** 用户请求暂停；durable loop 在下一步边界落 paused。 */
const pauseRequests = new Set<string>()
/** workflow runId → 正在执行的子 agent runId；取消时连带中止。 */
const childRuns = new Map<string, string>()

export function startWorkflow(input: {
  sessionId: string
  workspaceId?: string
  title: string
  steps?: Array<{ id: string; label: string; dependsOn?: string[] }>
}) {
  const id = createId("wf")
  const steps = input.steps?.length ? input.steps : DEFAULT_STEPS
  insertRun(getDatabase(), {
    id,
    sessionId: input.sessionId,
    workspaceId: input.workspaceId ?? null,
    kind: "workflow",
    status: "paused",
    modelId: null,
    providerId: null,
    checkpoint: JSON.stringify({ stepIndex: 0, title: input.title, steps }),
    error: null
  })
  return getWorkflow(id)
}

export function shouldRecoverRun(status: string): boolean {
  return status === "paused" || status === "running"
}

export async function recoverPausedWorkflows() {
  if (!readPreferences().workflowAutoResume) return []
  const paused = listRuns(getDatabase(), { kind: "workflow" }).filter((row) =>
    shouldRecoverRun(row.status)
  )
  const recovered: Array<ReturnType<typeof getWorkflow>> = []
  for (const row of paused) {
    recovered.push(await resumeWorkflow(row.id))
  }
  return recovered
}

/** 立即返回；推进在后台进行，IPC 不被多步循环阻塞。 */
export async function resumeWorkflow(runId: string) {
  const row = getRun(getDatabase(), runId)
  if (!row) throw new Error("Workflow not found.")
  if (row.status === "completed" || row.status === "cancelled") {
    throw new Error("Workflow already finished.")
  }
  if (activeWorkflowRuns.has(runId)) return getWorkflow(runId)
  activeWorkflowRuns.add(runId)
  pauseRequests.delete(runId)
  updateRun(getDatabase(), runId, { status: "running", error: null })
  void driveWorkflow(runId).catch(() => undefined)
  return getWorkflow(runId)
}

export function pauseWorkflow(runId: string) {
  if (!getRun(getDatabase(), runId)) throw new Error("Workflow not found.")
  pauseRequests.add(runId)
  return getWorkflow(runId)
}

export function cancelWorkflow(runId: string) {
  if (!getRun(getDatabase(), runId)) throw new Error("Workflow not found.")
  const childRunId = childRuns.get(runId)
  if (childRunId) void abortAgent(childRunId).catch(() => undefined)
  updateRun(getDatabase(), runId, { status: "cancelled" })
  return getWorkflow(runId)
}

export async function retryWorkflow(runId: string, stepId?: string) {
  const row = getRun(getDatabase(), runId)
  if (!row) throw new Error("Workflow not found.")
  if (activeWorkflowRuns.has(runId)) throw new Error("Workflow is currently running.")
  const checkpoint = parseCheckpoint(row.checkpoint)
  const steps = checkpoint.steps ?? DEFAULT_STEPS
  // 从指定步重试：清掉该步（含）之后的持久化行，checkpoint 归位到该步。
  const startIdx = stepId ? steps.findIndex((step) => step.id === stepId) : -1
  const stepIndex = stepId ? (startIdx === -1 ? 0 : startIdx) : 0
  deleteRunStepsFrom(getDatabase(), runId, stepIndex)
  updateRun(getDatabase(), runId, {
    status: "paused",
    error: null,
    checkpoint: JSON.stringify({ stepIndex, title: checkpoint.title, steps })
  })
  return resumeWorkflow(runId)
}

async function driveWorkflow(runId: string): Promise<void> {
  try {
    const row = getRun(getDatabase(), runId)
    if (!row) return
    const checkpoint = parseCheckpoint(row.checkpoint)
    const result = await runDurableWorkflow({
      resumeFrom: checkpoint.stepIndex,
      shouldPause: () => pauseRequests.has(runId),
      persist: async (next) => {
        assertNotCancelled(runId)
        persistCheckpoint(runId, row.sessionId, checkpoint, next)
      },
      steps: durableSteps(
        checkpoint.steps,
        row.workspaceId,
        row.sessionId,
        checkpoint.title,
        runId
      )
    })
    if (getRun(getDatabase(), runId)?.status === "cancelled") return
    updateRun(getDatabase(), runId, {
      status: result.status === "completed" ? "completed" : "paused"
    })
  } catch (error) {
    if (getRun(getDatabase(), runId)?.status === "cancelled") return
    updateRun(getDatabase(), runId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Workflow step failed."
    })
  } finally {
    activeWorkflowRuns.delete(runId)
    pauseRequests.delete(runId)
    childRuns.delete(runId)
  }
}

function assertNotCancelled(runId: string): void {
  if (getRun(getDatabase(), runId)?.status === "cancelled") {
    throw new Error(CANCEL_SENTINEL)
  }
}

function persistCheckpoint(
  runId: string,
  sessionId: string,
  checkpoint: { title?: string; steps?: Array<{ id: string; label: string; dependsOn?: string[] }> },
  next: WorkflowCheckpoint
): void {
  const checkpointId = `cp_${next.stepIndex}`
  updateRun(getDatabase(), runId, {
    status:
      next.status === "paused"
        ? "paused"
        : next.status === "completed"
          ? "completed"
          : "running",
    checkpoint: JSON.stringify({ ...next, title: checkpoint.title, steps: checkpoint.steps })
  })
  insertRunStep(getDatabase(), {
    id: createId("wfs"),
    runId,
    idx: next.stepIndex,
    label: next.inputSummary,
    status: next.status,
    outputSummary: next.outputSummary,
    checkpointId
  })
  emitWorkflowProgress(runId, sessionId, next.stepIndex, checkpointId, next.status, next.inputSummary)
}

function parseCheckpoint(raw: string | null): {
  stepIndex: number
  title?: string
  steps?: Array<{ id: string; label: string; dependsOn?: string[] }>
} {
  if (!raw) return { stepIndex: 0, steps: DEFAULT_STEPS }
  try {
    const parsed = JSON.parse(raw) as {
      stepIndex?: number
      title?: string
      steps?: Array<{ id: string; label: string; dependsOn?: string[] }>
    }
    return {
      stepIndex: parsed.stepIndex ?? 0,
      title: parsed.title,
      steps: parsed.steps?.length ? parsed.steps : DEFAULT_STEPS
    }
  } catch {
    return { stepIndex: 0, steps: DEFAULT_STEPS }
  }
}

function emitWorkflowProgress(
  runId: string,
  sessionId: string,
  stepIndex: number,
  checkpointId: string,
  status: string,
  label: string
) {
  stampAndBroadcast(
    { type: "workflow.checkpoint", runId, checkpointId, stepIndex },
    sessionId
  )
  if (status === "running") {
    stampAndBroadcast({ type: "step.start", runId, stepId: checkpointId, label }, sessionId)
  }
  if (status === "paused") {
    stampAndBroadcast({ type: "workflow.paused", runId, reason: "checkpoint" }, sessionId)
  }
  if (status === "completed") {
    stampAndBroadcast({ type: "step.end", runId, stepId: checkpointId }, sessionId)
  }
}

function durableSteps(
  steps: Array<{ id: string; label: string; dependsOn?: string[] }> | undefined,
  workspaceId: string | null,
  sessionId: string,
  title: string | undefined,
  runId: string
) {
  return (steps?.length ? steps : DEFAULT_STEPS).map((step) => ({
    id: step.id,
    label: step.label,
    dependsOn: step.dependsOn,
    run: async () => {
      if (!workspaceId) return { outputSummary: `${step.label} skipped (no workspace)` }
      try {
        return {
          outputSummary: await runWorkflowAgentStep({
            id: step.id,
            label: step.label,
            sessionId,
            workspaceId,
            title,
            onChildRun: (childRunId) => childRuns.set(runId, childRunId),
            onChildStatus: (childStatus) => syncWorkflowStatus(runId, childStatus)
          })
        }
      } finally {
        childRuns.delete(runId)
      }
    }
  }))
}

/** 子 run 停车审批 ↔ workflow 行状态对齐；不碰 cancelled/failed。 */
function syncWorkflowStatus(runId: string, childStatus: string): void {
  const row = getRun(getDatabase(), runId)
  if (!row) return
  if (childStatus === "waiting_review" && row.status === "running") {
    updateRun(getDatabase(), runId, { status: "waiting_review" })
    return
  }
  if (childStatus !== "waiting_review" && row.status === "waiting_review") {
    updateRun(getDatabase(), runId, { status: "running" })
  }
}

function toPublic(row: ReturnType<typeof getRun>) {
  if (!row) throw new Error("Workflow not found.")
  return {
    id: row.id,
    sessionId: row.sessionId,
    workspaceId: row.workspaceId ?? undefined,
    title: parseCheckpoint(row.checkpoint).title ?? "Plan → Act → Verify",
    status: row.status,
    // 合约要求的是 checkpoint id，不是整份 checkpoint JSON。
    lastCheckpointId: row.checkpoint
      ? `cp_${parseCheckpoint(row.checkpoint).stepIndex}`
      : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    error: row.error ?? undefined,
    steps: []
  }
}
