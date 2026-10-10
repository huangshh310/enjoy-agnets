/**
 * 启动后把「工具边界」running 孤儿接回泵。ACP / 无快照 / 审批中不走这里。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { parseGenerationCheckpoint } from "@enjoy-agents/agent-core"
import { isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import { getRun, listRuns, updateRun, type RunRow } from "@enjoy-agents/db"
import { RunAgentInput } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { emitEvent, holdAgentRun } from "./agent-run-state"
import { resolveRunSecret, resolveRuntimeId } from "./agent-run-helpers"
import { readPreferences } from "./preferences"
import { trustedAutomationFlags } from "./agent-run-trust"
import { parseAgentCheckpointExtras, canResumeRunningOrphan } from "./running-orphan-plan"
import {
  attachRestoredCatchUp,
  markRestoredCatchUpIdle,
  markRestoredCatchUpRunning,
  stampUnrestoredCatchUp
} from "./restore-catchup"
import { claimRestoreRunningOnce } from "./restore-once"
import { getWorkspace } from "./workspace"
import { isE2eStub } from "./e2e-stub"
import { prepareAndPump } from "./agent-run-prepare"
import { hydrateActiveRunUsage } from "./run-usage"
import {
  emitQueuedInterruptedRunning,
  queueInterruptedRunningSettle
} from "./restore-interrupted-running"
import { readLatestAssistantSnapshot } from "./restore-assistant-snapshot"

export async function restoreRunningRuns(window: BrowserWindow): Promise<void> {
  if (!claimRestoreRunningOnce()) return
  const db = getDatabase()
  const prefs = readPreferences()
  const stub = isE2eStub()
  for (const row of listRuns(db, {}).filter((item) => item.status === "running")) {
    if (!stub && canResumeRunningOrphan(row) && !shouldCancelAcp(parseAgentCheckpointExtras(row.checkpoint).runtimeId)) {
      await restoreOne(window, row, prefs)
      continue
    }
    queueInterruptedRunningSettle(row)
  }
  emitQueuedInterruptedRunning(window)
}

async function restoreOne(
  window: BrowserWindow,
  row: RunRow,
  prefs: ReturnType<typeof readPreferences>
): Promise<void> {
  const extras = parseAgentCheckpointExtras(row.checkpoint)
  if (shouldCancelAcp(extras.runtimeId)) {
    cancelRestoredRun(row.id, "ACP host cannot resume after restart.", extras.automationSource)
    return
  }
  const checkpoint = parseGenerationCheckpoint(row.checkpoint)
  if (!checkpoint?.request || !row.workspaceId) {
    cancelRestoredRun(row.id, "Missing generation checkpoint.", extras.automationSource)
    return
  }
  markRestoredCatchUpRunning(extras.automationSource)
  try {
    const restored = await holdAndPump(window, row, extras, checkpoint.request, prefs)
    if (!restored) {
      markRestoredCatchUpIdle(extras.automationSource)
      stampUnrestoredCatchUp(row.id, extras.automationSource)
      return
    }
    attachRestoredCatchUp(row.id, extras.automationSource)
  } catch (error) {
    markRestoredCatchUpIdle(extras.automationSource)
    cancelRestoredRun(
      row.id,
      error instanceof Error ? error.message : "Failed to restore running run.",
      extras.automationSource
    )
  }
}

function cancelRestoredRun(runId: string, error: string, source: unknown): void {
  const db = getDatabase()
  const row = getRun(db, runId)
  if (row) {
    if (!row.error) updateRun(db, runId, { error })
    const next = getRun(db, runId)
    if (next) queueInterruptedRunningSettle(next)
  } else {
    updateRun(db, runId, { status: "cancelled", error, checkpoint: null })
  }
  stampUnrestoredCatchUp(runId, source)
}

function shouldCancelAcp(runtimeId: string | undefined): boolean {
  return Boolean(runtimeId && isAcpHostRuntime(runtimeId))
}

async function holdAndPump(
  window: BrowserWindow,
  row: RunRow,
  extras: ReturnType<typeof parseAgentCheckpointExtras>,
  request: { modelId?: string; messages?: Array<{ role: string; content: unknown }> },
  prefs: ReturnType<typeof readPreferences>
): Promise<boolean> {
  const workspace = await getWorkspace(row.workspaceId as string)
  const flags = trustedAutomationFlags(extras)
  const input = RunAgentInput.parse({
    sessionId: row.sessionId,
    workspaceId: row.workspaceId,
    modelId: row.modelId ?? request.modelId,
    runtimeId: extras.runtimeId,
    denyAnyDesktop: flags.denyAnyDesktop,
    automationSource: flags.automationSource,
    origin: flags.origin,
    messages: (request.messages ?? []).map((message) => ({
      role: message.role,
      content: typeof message.content === "string" ? message.content : ""
    }))
  })
  const runtimeId = resolveRuntimeId(input, prefs)
  if (isAcpHostRuntime(runtimeId)) {
    cancelRestoredRun(row.id, "ACP host cannot resume after restart.", extras.automationSource)
    return false
  }
  const secret = await resolveRunSecret(runtimeId, prefs.codingRuntime, prefs.harnessId)
  holdAgentRun({
    runId: row.id,
    window,
    input,
    workspaceRoot: workspace.rootPath,
    secret,
    messages: extras.modelMessages as ModelMessage[],
    ...readLatestAssistantSnapshot(row.sessionId, { runCreatedAt: row.createdAt, runId: row.id })
  })
  hydrateActiveRunUsage(row.id)
  emitEvent(window, { type: "run.start", runId: row.id, sessionId: input.sessionId, kind: "agent" })
  void prepareAndPump(row.id)
  return true
}
