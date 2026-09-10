/**
 * Workflow durable run：列表、恢复、取消、重试。崩溃后从 checkpoint 续跑。
 */
import { getRun, insertRun, insertRunStep, listRunSteps, listRuns, updateRun } from "@enjoy-agents/db"
import { runDurableWorkflow } from "@enjoy-agents/agent-core"
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

export async function resumeWorkflow(runId: string) {
  const row = getRun(getDatabase(), runId)
  if (!row) throw new Error("Workflow not found.")
  const checkpoint = parseCheckpoint(row.checkpoint)
  updateRun(getDatabase(), runId, { status: "running" })
  const result = await runDurableWorkflow({
    resumeFrom: checkpoint.stepIndex,
    persist: async (next) => {
      const checkpointId = `cp_${next.stepIndex}`
      updateRun(getDatabase(), runId, {
        status: next.status === "paused" ? "paused" : next.status === "completed" ? "completed" : "running",
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
      emitWorkflowProgress(runId, row.sessionId, next.stepIndex, checkpointId, next.status, next.inputSummary)
    },
    steps: durableSteps(checkpoint.steps, row.workspaceId, row.sessionId, checkpoint.title)
  })
  updateRun(getDatabase(), runId, {
    status: result.status === "completed" ? "completed" : "paused"
  })
  return getWorkflow(runId)
}

export function cancelWorkflow(runId: string) {
  updateRun(getDatabase(), runId, { status: "cancelled" })
  return getWorkflow(runId)
}

export async function retryWorkflow(runId: string) {
  const row = getRun(getDatabase(), runId)
  const title = parseCheckpoint(row?.checkpoint ?? null).title
  updateRun(getDatabase(), runId, {
    status: "paused",
    error: null,
    checkpoint: JSON.stringify({ stepIndex: 0, title, steps: parseCheckpoint(row?.checkpoint ?? null).steps })
  })
  return resumeWorkflow(runId)
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
  title?: string
) {
  return (steps?.length ? steps : DEFAULT_STEPS).map((step) => ({
    id: step.id,
    label: step.label,
    dependsOn: step.dependsOn,
    run: async () => ({
      outputSummary: workspaceId
        ? await runWorkflowAgentStep({
            id: step.id,
            label: step.label,
            sessionId,
            workspaceId,
            title
          })
        : `${step.label} skipped (no workspace)`
    })
  }))
}

function toPublic(row: ReturnType<typeof getRun>) {
  if (!row) throw new Error("Workflow not found.")
  return {
    id: row.id,
    sessionId: row.sessionId,
    workspaceId: row.workspaceId ?? undefined,
    title: parseCheckpoint(row.checkpoint).title ?? "Plan → Act → Verify",
    status: row.status,
    lastCheckpointId: row.checkpoint ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    error: row.error ?? undefined,
    steps: []
  }
}
