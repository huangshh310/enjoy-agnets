/**
 * 内存泵中止：归档与 abortAgent 共用，避免两份拷贝。
 * 不在这里静态拉 open-coding-stream，测试 strip-types 才不会进 ACP。
 */
import { USER_ABORT_MESSAGE } from "./claim-run-end"
import { persistActiveRun } from "./flush-agent-run"
import { clearCatchUpApprovalTimeout } from "./automations-catchup-timer"
import { clearSteer } from "./runtime-interact/steering-queue"
import { deleteActiveRun, emitEvent, getActiveRun, settleRun } from "./agent-run-state"
import { persistTurnWorkflow, turnOutcomeForRun } from "./apply-turn-outcome"

export function abortActiveRunMemory(runId: string): ReturnType<typeof getActiveRun> {
  const run = getActiveRun(runId)
  clearCatchUpApprovalTimeout(runId)
  if (run) {
    run.userCancelled = true
    persistActiveRun(run, runId, "cancelled")
    clearSteer(run.input.sessionId)
    settleRun(runId, { status: "error", summary: USER_ABORT_MESSAGE })
    const turn = turnOutcomeForRun(run, "abort")
    persistTurnWorkflow(run.input.sessionId, turn)
    emitEvent(run.window, { type: "run.error", runId, message: USER_ABORT_MESSAGE, turn })
    run.abort.abort()
  }
  deleteActiveRun(runId)
  return run
}

export function logCancelStreamError(error: unknown): void {
  if (process.env.NODE_ENV === "test" || process.env.ENJOY_E2E_STUB === "1") return
  console.error("cancelCodingStream failed", error)
}
