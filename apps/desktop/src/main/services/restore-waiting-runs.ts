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
import { getActiveRun, holdAgentRun } from "./agent-run-state"
import { claimRestoreWaitingOnce, markRestoreWaitingSettled } from "./restore-once"
import { readPreferences } from "./preferences"
import { parseWaitingExtras } from "./persist-waiting-run"
import { toModelMessages } from "./to-model-messages"
import { assertApprovalHmac } from "./approval-hmac"
import { hydrateActiveRunUsage } from "./run-usage"
import { parseStoredApprovalArgs } from "./restore-approval-args"
import { endRestoredRunWithoutSdkReply } from "./restore-checkpoint-approval"
import { restoreHeldWaitingApprovals } from "./restore-waiting-approvals"
import { settleListedApprovals } from "./settle-run-approvals"

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
    const { passed: pending, hmacFailed } = partitionHmacPending(row.id, listPendingApprovals(db, row.id))
    if (hmacFailed.length > 0) {
      settleListedApprovals(
        hmacFailed.map((item) => ({
          runId: row.id,
          approvalId: item.id,
          toolCallId: item.toolCallId
        })),
        window,
        "restart",
        { writeSdkResponse: false }
      )
      abandonWaitingRestore(row.id, window, { sessionId: row.sessionId })
      continue
    }
    const checkpoint = parseGenerationCheckpoint(row.checkpoint)
    const decidable = pending.filter((item) => parseStoredApprovalArgs(item) != null)
    if (!row.workspaceId || !checkpoint?.request || decidable.length === 0) {
      abandonWaitingRestore(row.id, window, { sessionId: row.sessionId })
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
      const runtimeId = extras.runtimeId ?? input.runtimeId ?? prefs.runtimeId ?? "enjoy-local"
      const secret = await resolveRestoreSecret(runtimeId, prefs)
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
      if (!run) {
        abandonWaitingRestore(row.id, window, { sessionId: row.sessionId })
        continue
      }
      run.pendingApprovals = extras.pendingApprovals?.length
        ? extras.pendingApprovals
        : decidable.map((item) => ({
            approvalId: item.id,
            toolCallId: item.toolCallId,
            name: item.name
          }))
      const restored = restoreHeldWaitingApprovals({
        runId: row.id,
        hmacPending: decidable,
        items: run.pendingApprovals,
        window
      })
      if (restored.ended) continue
      run.pendingApprovals = restored.keep
      if (restored.keep.length === 0) {
        abandonWaitingRestore(row.id, window, { sessionId: row.sessionId })
      }
    } catch (error) {
      abandonWaitingRestore(row.id, window, { sessionId: row.sessionId, cause: error })
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

/** 回挂对不上：未决 cancelled（restart），run 记停止，发诚实收工码。 */
export function abandonWaitingRestore(
  runId: string,
  window: BrowserWindow,
  input?: { sessionId?: string; cause?: unknown }
): void {
  if (input?.cause) {
    console.error("[restore] abandon waiting restore", { runId, cause: input.cause })
  }
  endRestoredRunWithoutSdkReply(getDatabase(), runId, window, input?.sessionId)
}

async function resolveRestoreSecret(
  runtimeId: string,
  prefs: ReturnType<typeof readPreferences>
) {
  try {
    const { resolveRunSecret } = await import("./agent-run-helpers")
    return await resolveRunSecret(runtimeId, prefs.codingRuntime, prefs.harnessId)
  } catch {
    // 缺 Key / 测试拆条拉不到 ACP：仍回挂可决策卡，执行时再闸。
    return undefined
  }
}

