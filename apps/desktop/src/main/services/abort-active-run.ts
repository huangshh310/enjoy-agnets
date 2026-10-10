/**
 * 内存泵中止：归档与 abortAgent 共用，避免两份拷贝。
 * 不在这里静态拉 open-coding-stream，测试 strip-types 才不会进 ACP。
 * 用户 Stop / 归档都不是出错：Attention 中性，码 user_aborted，不写 error 槽。
 */
import { sealAbandonedTools } from "@enjoy-agents/ipc-contract"
import { USER_ABORTED_CODE } from "@enjoy-agents/ipc-contract/desktop-notify"
import { USER_ABORT_MESSAGE } from "./claim-run-end"
import { persistActiveRun } from "./flush-agent-run"
import { clearCatchUpApprovalTimeout } from "./automations-catchup-timer"
import { clearSteer } from "./runtime-interact/steering-queue"
import { deleteActiveRun, emitEvent, getActiveRun, settleRun } from "./agent-run-state"
import { persistTurnWorkflow, turnOutcomeForRun } from "./apply-turn-outcome"
import { settlePendingApprovalsForRun } from "./settle-run-approvals"

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
    const turn = turnOutcomeForRun(run, "abort")
    if (!archived) persistTurnWorkflow(run.input.sessionId, turn)
    emitEvent(run.window, {
      type: "run.error",
      runId,
      message: USER_ABORT_MESSAGE,
      code: USER_ABORTED_CODE,
      turn,
      sessionId: run.input.sessionId
    })
    run.abort.abort()
  }
  deleteActiveRun(runId)
  return run
}

export function logCancelStreamError(error: unknown): void {
  if (process.env.NODE_ENV === "test" || process.env.ENJOY_E2E_STUB === "1") return
  console.error("cancelCodingStream failed", error)
}
