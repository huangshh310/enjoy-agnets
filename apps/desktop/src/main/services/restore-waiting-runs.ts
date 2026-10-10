/**
 * 启动后把 waiting_review 的审批重新挂到 ActiveRun，并发 approval.required。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { parseGenerationCheckpoint } from "@enjoy-agents/agent-core"
import { isSupersededSdkApprovalId, listPendingApprovals, listRuns, updateRun } from "@enjoy-agents/db"
import { inferAgentRunOrigin, RunAgentInput } from "@enjoy-agents/ipc-contract"
import { shouldFailWaitingCatchUp } from "./automations-catchup-orphans"
import { failCatchUpWaitingOnRestart } from "./fail-catchup-waiting-restart"
import { getDatabase } from "./database"
import { deleteActiveRun, emitEvent, getActiveRun, holdAgentRun } from "./agent-run-state"
import { claimRestoreWaitingOnce, markRestoreWaitingSettled } from "./restore-once"
import { readPreferences } from "./preferences"
import { parseWaitingExtras } from "./persist-waiting-run"
import { toModelMessages } from "./to-model-messages"
import { assertApprovalHmac } from "./approval-hmac"
import { hydrateActiveRunUsage } from "./run-usage"
import {
  endRestoredRunWithoutSdkReply,
  RESTORE_NO_MATCHING_CODE
} from "./restore-checkpoint-approval"
import { restoreHeldWaitingApprovals } from "./restore-waiting-approvals"
import { settleListedApprovals, settlePendingApprovalsForRun } from "./settle-run-approvals"

export async function restoreWaitingRuns(window: BrowserWindow): Promise<void> {
  if (!claimRestoreWaitingOnce()) return
  try {
    await restoreWaitingRunsOnce(window)
  } finally {
    markRestoreWaitingSettled()
  }
}

async function restoreWaitingRunsOnce(window: BrowserWindow): Promise<void> {
  const db = getDatabase()
  const waiting = listRuns(db, {}).filter((row) => row.status === "waiting_review")
  const prefs = readPreferences()
  for (const row of waiting) {
    const extras = parseWaitingExtras(row.checkpoint)
    if (getActiveRun(row.id)) continue
    if (shouldFailWaitingCatchUp(extras.automationSource, false)) {
      failCatchUpWaitingOnRestart(row.id)
      continue
    }
    const checkpointPendings = extras.pendingApprovals ?? []
    const { passed: pending, hmacFailed } = partitionHmacPending(row.id, listPendingApprovals(db, row.id))
    if (hmacFailed.length > 0) {
      settleListedApprovals(
        hmacFailed.map((item) => ({
          runId: row.id,
          approvalId: item.id,
          toolCallId: item.toolCallId
        })),
        window,
        "failed",
        { writeSdkResponse: false }
      )
    }
    if (hmacFailed.some((item) => checkpointPendings.some((pending) => pending.approvalId === item.id))) {
      endRestoredRunWithoutSdkReply(db, row.id, window)
      continue
    }
    if (!row.workspaceId) {
      abandonWaitingRestore(row.id, window, {
        status: "cancelled",
        error: "No pending approval after restart.",
        cause: "failed",
        sessionId: row.sessionId
      })
      continue
    }
    const checkpoint = parseGenerationCheckpoint(row.checkpoint)
    if (!checkpoint?.request) {
      abandonWaitingRestore(row.id, window, {
        status: "cancelled",
        error: "Missing generation checkpoint.",
        cause: "failed",
        sessionId: row.sessionId
      })
      continue
    }
    if (pending.length === 0 && checkpointPendings.length === 0) {
      abandonWaitingRestore(row.id, window, {
        status: "cancelled",
        error: "No pending approval after restart.",
        cause: "failed",
        sessionId: row.sessionId
      })
      continue
    }
    try {
      const { getWorkspace } = await import("./workspace")
      const workspace = await getWorkspace(row.workspaceId)
      const input = RunAgentInput.parse({
        sessionId: row.sessionId,
        workspaceId: row.workspaceId,
        modelId: row.modelId ?? checkpoint.request.modelId,
        runtimeId: extras.runtimeId,
        denyAnyDesktop: extras.denyAnyDesktop,
        automationSource: extras.automationSource,
        origin: inferAgentRunOrigin(extras.origin, extras.automationSource),
        messages: (checkpoint.request.messages ?? []).map((message) => ({
          role: message.role,
          content: typeof message.content === "string" ? message.content : ""
        }))
      })
      const { resolveRunSecret, resolveRuntimeId } = await import("./agent-run-helpers")
      const runtimeId = resolveRuntimeId(input, prefs)
      const secret = await resolveRunSecret(runtimeId, prefs.codingRuntime, prefs.harnessId)
      const messages = Array.isArray(extras.modelMessages)
        ? (extras.modelMessages as ModelMessage[])
        : toModelMessages(input.messages)
      holdAgentRun({
        runId: row.id,
        window,
        input,
        workspaceRoot: workspace.rootPath,
        secret,
        messages
      })
      hydrateActiveRunUsage(row.id)
      const run = getActiveRun(row.id)
      if (!run) continue
      run.pendingApprovals = extras.pendingApprovals?.length
        ? extras.pendingApprovals
        : pending.map((item) => ({
            approvalId: item.id,
            toolCallId: item.toolCallId,
            name: item.name
          }))
      const restored = restoreHeldWaitingApprovals({
        runId: row.id,
        hmacPending: pending,
        items: run.pendingApprovals,
        window
      })
      if (restored.ended) continue
      run.pendingApprovals = restored.keep
      if (restored.keep.length === 0) {
        run.resumeAfterPump = true
        if (!run.pumping) {
          const { pumpStream } = await import("./agent-pump.ts")
          void pumpStream(row.id)
        }
      }
    } catch (error) {
      abandonWaitingRestore(row.id, window, {
        status: "cancelled",
        error: error instanceof Error ? error.message : "Failed to restore waiting run.",
        cause: "failed",
        sessionId: row.sessionId
      })
    }
  }
}

function partitionHmacPending(
  runId: string,
  rows: ReturnType<typeof listPendingApprovals>
): {
  passed: ReturnType<typeof listPendingApprovals>
  hmacFailed: ReturnType<typeof listPendingApprovals>
} {
  const passed: ReturnType<typeof listPendingApprovals> = []
  const hmacFailed: ReturnType<typeof listPendingApprovals> = []
  for (const item of rows) {
    if (isSupersededSdkApprovalId(item.sdkApprovalId)) continue
    try {
      assertApprovalHmac({ runId, approvalId: item.id, toolCallId: item.toolCallId })
      passed.push(item)
    } catch {
      hmacFailed.push(item)
    }
  }
  return { passed, hmacFailed }
}

/** 回挂取消：先结清未决（已决不覆盖），再改 run 终态，并发诚实收工码。 */
export function abandonWaitingRestore(
  runId: string,
  window: BrowserWindow,
  input: { status: "cancelled" | "failed"; error: string; cause: "failed"; sessionId?: string }
): void {
  settlePendingApprovalsForRun(runId, window, input.cause)
  updateRun(getDatabase(), runId, { status: input.status, error: RESTORE_NO_MATCHING_CODE })
  const run = getActiveRun(runId)
  emitEvent(window, {
    type: "run.error",
    runId,
    sessionId: input.sessionId ?? run?.input.sessionId,
    message: RESTORE_NO_MATCHING_CODE,
    code: RESTORE_NO_MATCHING_CODE,
    turn: { workflow: "todo", attention: "neutral" }
  })
  if (run) deleteActiveRun(runId)
}

