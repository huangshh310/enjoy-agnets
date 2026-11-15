/**
 * 内存泵中止：归档与 abortAgent 共用，避免两份拷贝。
 * 不在这里静态拉 open-coding-stream，测试 strip-types 才不会进 ACP。
 * 用户 Stop：Attention=stopped；归档：Attention=neutral。码 user_aborted，不写 error 槽。
 *
 * 「再停一次」复用同一条 ai.abort / agent.abort：activeRuns 里没有、账本仍有未 settle 项时
 * fire-and-forget 调用 rekill，IPC 不等待 settle。
 */
import { sealAbandonedTools } from "@enjoy-agents/ipc-contract/fold-tool-event"
import { USER_ABORTED_CODE } from "@enjoy-agents/ipc-contract/desktop-notify"
import { STOP_KILL_GRACE_MS } from "@enjoy-agents/ipc-contract/stop-receipt"
import { USER_ABORT_MESSAGE } from "./claim-run-end"
import { persistActiveRun } from "./flush-agent-run"
import { clearCatchUpApprovalTimeout } from "./automations-catchup-timer"
import { clearSteer } from "./runtime-interact/steering-queue"
import { deleteActiveRun, emitEvent, getActiveRun, settleRun } from "./agent-run-state"
import { persistTurnWorkflow, turnOutcomeForRun } from "./apply-turn-outcome"
import { settlePendingApprovalsForRun } from "./settle-run-approvals"
import { readPreferences } from "./preferences"
import { effectiveToolTimeoutMs } from "./e2e-stub-gate"
import {
  armSettleWatch,
  hasUnsettled,
  latestDeadlineAt,
  rekill,
  rememberKnownTools
} from "./run-side-effects"
import { selectKnownToolsForReceipt } from "./stop-receipt-decide"

export function abortActiveRunMemory(
  runId: string,
  opts?: { reason?: "user" | "archive" }
): ReturnType<typeof getActiveRun> {
  const run = getActiveRun(runId)
  clearCatchUpApprovalTimeout(runId)
  if (run) {
    run.userCancelled = true
    settlePendingApprovalsForRun(runId, run.window)
    run.tools = sealAbandonedTools(run.tools, { aborted: true }) ?? run.tools
    persistActiveRun(run, runId, "cancelled")
    clearSteer(run.input.sessionId)
    const archived = opts?.reason === "archive"
    settleRun(runId, {
      status: "error",
      summary: archived ? "archived" : USER_ABORT_MESSAGE
    })
    const unsettled = !archived && hasUnsettled(runId)
    const stopRequestedAt = Date.now()
    if (unsettled) {
      rememberKnownTools(runId, selectKnownToolsForReceipt(run.tools))
      const deadlineAt =
        latestDeadlineAt(runId) ??
        stopRequestedAt + effectiveToolTimeoutMs(readPreferences().toolTimeoutMs ?? 30_000) + STOP_KILL_GRACE_MS
      emitEvent(run.window, {
        type: "run.error",
        runId,
        message: USER_ABORT_MESSAGE,
        code: USER_ABORTED_CODE,
        preOutput: false,
        settling: { deadlineAt, stopRequestedAt },
        sessionId: run.input.sessionId
      })
      run.abort.abort()
      armSettleWatch({
        runId,
        sessionId: run.input.sessionId,
        window: run.window,
        tools: run.tools,
        input: run.input,
        abortAt: stopRequestedAt
      })
    } else {
      const turn = turnOutcomeForRun(run, archived ? "archive" : "abort")
      if (!archived) persistTurnWorkflow(run.input.sessionId, turn)
      emitEvent(run.window, {
        type: "run.error",
        runId,
        message: USER_ABORT_MESSAGE,
        code: USER_ABORTED_CODE,
        preOutput: false,
        turn,
        sessionId: run.input.sessionId
      })
      run.abort.abort()
    }
  } else if (hasUnsettled(runId)) {
    // 「再停一次」：run 已从 activeRuns 删除，账本仍在途。不等待 settle。
    void rekill(runId)
  }
  deleteActiveRun(runId)
  return run
}

export function logCancelStreamError(error: unknown): void {
  if (process.env.NODE_ENV === "test" || process.env.ENJOY_E2E_STUB === "1") return
  console.error("cancelCodingStream failed", error)
}
