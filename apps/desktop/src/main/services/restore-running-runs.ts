/**
 * 启动后把「工具边界」running 孤儿接回泵。ACP / 无快照 / 审批中不走这里。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { parseGenerationCheckpoint } from "@enjoy-agents/agent-core"
import { isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import { listRuns, updateRun, type RunRow } from "@enjoy-agents/db"
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

export async function restoreRunningRuns(window: BrowserWindow): Promise<void> {
  if (isE2eStub()) return
  if (!claimRestoreRunningOnce()) return
  const db = getDatabase()
  const prefs = readPreferences()
  for (const row of listRuns(db, {}).filter((item) => canResumeRunningOrphan(item))) {
    await restoreOne(window, row, prefs)
  }
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
  updateRun(getDatabase(), runId, { status: "cancelled", error })
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
    messages: (request.messages ?? []).map((message) => ({
      role: message.role,
      content: typeof message.content === "string" ? message.content : ""
    }))
  })
  const runtimeId = resolveRuntimeId(input, prefs)
  if (isAcpHostRuntime(runtimeId)) {
    updateRun(getDatabase(), row.id, {
      status: "cancelled",
      error: "ACP host cannot resume after restart."
    })
    return false
  }
  const secret = await resolveRunSecret(runtimeId, prefs.codingRuntime, prefs.harnessId)
  holdAgentRun({
    runId: row.id,
    window,
    input,
    workspaceRoot: workspace.rootPath,
    secret,
    messages: extras.modelMessages as ModelMessage[]
  })
  emitEvent(window, { type: "run.start", runId: row.id, sessionId: input.sessionId })
  void prepareAndPump(row.id)
  return true
}
