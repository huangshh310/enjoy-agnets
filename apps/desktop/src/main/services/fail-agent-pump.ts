/**
 * 泵失败收口：落库 failed、发 run.error。
 * 用户取消由 abortAgent 先发 abort 事件并标 cancelled，这里不覆盖成 failed。
 */
import { classifyError } from "@enjoy-agents/agent-core"
import { isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import { CATCH_UP_APPROVAL_TIMEOUT } from "@enjoy-agents/ipc-contract/automations-missed"
import { persistActiveRun } from "./flush-agent-run"
import { cancelCodingStream, disposeCodingStream, acpSessionAlive } from "./open-coding-stream"
import { recordMetric } from "./telemetry-service"
import { clearSteer } from "./runtime-interact/steering-queue"
import { deleteActiveRun, emitEvent, settleRun, type ActiveRun } from "./agent-run-state"
import { clearCatchUpApprovalTimeout } from "./automations-catchup-timer"
import { claimCatchUpFail } from "./claim-catchup-fail"
import { isCatchUpApprovalTimeoutError } from "./automations-catchup-timeout"

export async function failAgentPump(runId: string, run: ActiveRun, error: unknown): Promise<void> {
  clearCatchUpApprovalTimeout(runId)
  if (!claimCatchUpFail(runId)) return
  if (!run.userCancelled) {
    emitFailedRun(runId, run, error)
  }
  clearSteer(run.input.sessionId)
  deleteActiveRun(runId)
  const sessionId = run.input.sessionId
  if (isAcpHostRuntime(run.input.runtimeId) && acpSessionAlive(sessionId)) {
    await cancelCodingStream(runId)
    return
  }
  await disposeCodingStream(runId)
  const { endDesktopActOverlay } = await import("./builtin-tools/desktop-overlay-chrome")
  endDesktopActOverlay()
}

function emitFailedRun(runId: string, run: ActiveRun, error: unknown): void {
  if (isCatchUpApprovalTimeoutError(error)) {
    emitCatchUpTimeoutFail(runId, run)
    return
  }
  const classified = classifyError(error)
  persistActiveRun(run, runId, "failed", classified.message)
  recordMetric({
    runId,
    kind: "agent",
    modelId: run.input.modelId,
    status: "failed",
    durationMs: Date.now() - run.startedAt,
    errorClass: classified.errorClass
  })
  settleRun(runId, { status: "error", summary: classified.message })
  emitEvent(run.window, { type: "run.error", runId, message: classified.message })
  if (classified.errorClass !== "timeout") return
  emitEvent(run.window, {
    type: "generation.warning",
    runId,
    code: "timeout",
    message: classified.message
  })
}

function emitCatchUpTimeoutFail(runId: string, run: ActiveRun): void {
  persistActiveRun(run, runId, "failed", CATCH_UP_APPROVAL_TIMEOUT)
  recordMetric({
    runId,
    kind: "agent",
    modelId: run.input.modelId,
    status: "failed",
    durationMs: Date.now() - run.startedAt,
    errorClass: "approval_denied"
  })
  settleRun(runId, { status: "error", summary: CATCH_UP_APPROVAL_TIMEOUT })
  emitEvent(run.window, { type: "run.error", runId, message: CATCH_UP_APPROVAL_TIMEOUT })
}
