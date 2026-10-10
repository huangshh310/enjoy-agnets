/**
 * 泵失败收口：落库 failed、发 run.error。
 * 用户取消由 abortAgent 先发 abort 事件并标 cancelled，这里不覆盖成 failed。
 */
import { classifyError, INTERNAL_STORE_ERROR } from "@enjoy-agents/agent-core"
import { CATCH_UP_APPROVAL_TIMEOUT } from "@enjoy-agents/ipc-contract/automations-missed"
import { persistActiveRun } from "./flush-agent-run"
import { recordMetric } from "./telemetry-service"
import { clearSteer } from "./runtime-interact/steering-queue"
import { deleteActiveRun, emitEvent, settleRun, type ActiveRun } from "./agent-run-state"
import { clearCatchUpApprovalTimeout } from "./automations-catchup-timer"
import { claimCatchUpFail } from "./claim-catchup-fail"
import { isCatchUpApprovalTimeout } from "./automations-catchup-timeout"
import { persistTurnWorkflow, turnOutcomeForRun } from "./apply-turn-outcome"
import { settlePendingApprovalsForRun } from "./settle-run-approvals"

export async function failAgentPump(runId: string, run: ActiveRun, error: unknown): Promise<void> {
  clearCatchUpApprovalTimeout(runId)
  settlePendingApprovalsForRun(runId, run.window)
  if (!claimCatchUpFail(run)) return
  if (!run.userCancelled) {
    emitFailedRun(runId, run, error)
  }
  clearSteer(run.input.sessionId)
  deleteActiveRun(runId)
  await disposeFailedStream(runId, run)
}

async function disposeFailedStream(runId: string, run: ActiveRun): Promise<void> {
  try {
    const { isAcpHostRuntime } = await import("@enjoy-agents/agent-harness")
    const { cancelCodingStream, disposeCodingStream, acpSessionAlive } = await import(
      "./open-coding-stream"
    )
    const sessionId = run.input.sessionId
    if (isAcpHostRuntime(run.input.runtimeId) && acpSessionAlive(sessionId)) {
      await cancelCodingStream(runId)
      return
    }
    await disposeCodingStream(runId)
    const { endDesktopActOverlay } = await import("./builtin-tools/desktop-overlay-chrome")
    endDesktopActOverlay({ runId, sessionId: run.input.sessionId })
  } catch {
    // 流或 overlay 已拆：failed / run.error / settle 已经落下。
  }
}

function emitFailedRun(runId: string, run: ActiveRun, error: unknown): void {
  if (isCatchUpApprovalTimeout(run, error)) {
    emitCatchUpTimeoutFail(runId, run)
    return
  }
  const classified = classifyError(error)
  if (classified.message === INTERNAL_STORE_ERROR) {
    console.error("agent pump store error", error)
  }
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
  const turn = turnOutcomeForRun(run, "error")
  persistTurnWorkflow(run.input.sessionId, turn)
  emitEvent(run.window, { type: "run.error", runId, message: classified.message, turn })
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
  const turn = turnOutcomeForRun(run, "error")
  persistTurnWorkflow(run.input.sessionId, turn)
  emitEvent(run.window, { type: "run.error", runId, message: CATCH_UP_APPROVAL_TIMEOUT, turn })
}
