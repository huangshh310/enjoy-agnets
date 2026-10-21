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
import {
  classifyEnjoyLocalSendFailure,
  pushFullReadinessAfterSend,
  recordCredentialAfterSend
} from "./credential-send-outcome.ts"
import { failedTurnRoute } from "./failed-turn-route.ts"
import { readAgentToolOverrides } from "./agent-tools-overrides-read"
import { isPreOutputFailureCode } from "@enjoy-agents/ipc-contract/pre-output-failure"
import {
  isForegroundPreOutputFailure,
  preOutputAttention,
  preOutputRollbackIds,
  shouldRollbackPreOutput
} from "./pre-output-fail"
import { markRunDiscardedPreOutput, rollbackPreOutputMessages } from "./pre-output-rollback"

export async function failAgentPump(runId: string, run: ActiveRun, error: unknown): Promise<void> {
  clearCatchUpApprovalTimeout(runId)
  settlePendingApprovalsForRun(
    runId,
    run.window,
    run.userCancelled ? "aborted" : isCatchUpApprovalTimeout(run, error) ? "catch_up_timeout" : "failed"
  )
  if (!claimCatchUpFail(run)) return
  if (!run.userCancelled) {
    const sendFail = isCatchUpApprovalTimeout(run, error) ? null : classifyEnjoyLocalSendFailure(error)
    // jojo #169 P3：结构化 401 先落盘、先把「这份档案密钥被拒」推给渲染端，再发 run.error——
    // 卡一出现，「能不能发」就已经是被拒；不再等整张快照重算（列引擎 + ping 本机模型）那一段空窗。
    const written = sendFail?.persist
      ? await recordCredentialAfterSend(run, sendFail.persist).catch(() => undefined)
      : undefined
    if (!run.userCancelled) emitFailedRun(runId, run, error, sendFail)
    if (written) void pushFullReadinessAfterSend()
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

function emitFailedRun(
  runId: string,
  run: ActiveRun,
  error: unknown,
  sendFail: ReturnType<typeof classifyEnjoyLocalSendFailure>
): void {
  if (isCatchUpApprovalTimeout(run, error)) {
    emitCatchUpTimeoutFail(runId, run)
    return
  }
  const classified = classifyError(error)
  if (classified.message === INTERNAL_STORE_ERROR) {
    console.error("agent pump store error", error)
  }
  const code = sendFail?.code ?? (isPreOutputFailureCode(classified.message) ? classified.message : undefined)
  const message = code ?? classified.message
  const rollback = {
    producedOutput: Boolean(run.producedOutput),
    code,
    eligible: run.rollbackEligible === true
  }
  if (shouldRollbackPreOutput(rollback) && emitPreOutputFail(runId, run, rollback.code)) return
  persistActiveRun(run, runId, "failed", message)
  recordMetric({
    runId,
    kind: "agent",
    modelId: run.input.modelId,
    status: "failed",
    durationMs: Date.now() - run.startedAt,
    errorClass: classified.errorClass
  })
  settleRun(runId, { status: "error", summary: message })
  const turn = turnOutcomeForRun(run, "error")
  persistTurnWorkflow(run.input.sessionId, turn)
  emitEvent(run.window, {
    type: "run.error",
    runId,
    message,
    ...(code ? { code } : {}),
    preOutput: false,
    ...failedTurnRoute(run, readAgentToolOverrides),
    turn
  })
  if (classified.errorClass !== "timeout") return
  emitEvent(run.window, {
    type: "generation.warning",
    runId,
    code: "timeout",
    message: classified.message
  })
}

/** 回滚失败返回 false：调用方退回普通 failed 收口（runs 落 failed、撤活 run），会话不卡 RUN_ACTIVE。 */
function emitPreOutputFail(runId: string, run: ActiveRun, code: string): boolean {
  try {
    rollbackPreOutputMessages({
      sessionId: run.input.sessionId,
      messageIds: preOutputRollbackIds(run),
      snapshot: run.sessionSnapshot,
      titleAfterStart: run.titleAfterStart
    })
    markRunDiscardedPreOutput(runId, code)
  } catch (error) {
    console.error("pre-output rollback failed; falling back to failed run", error)
    return false
  }
  recordMetric({
    runId,
    kind: "agent",
    modelId: run.input.modelId,
    status: "failed",
    durationMs: Date.now() - run.startedAt,
    errorClass: "pre_output"
  })
  settleRun(runId, { status: "error", summary: code })
  const foreground = isForegroundPreOutputFailure(run)
  const turn = {
    ...turnOutcomeForRun(run, "error"),
    workflow: (run.sessionSnapshot?.workflowStatus as "todo" | "in_progress" | "needs_review") ?? "todo",
    attention: preOutputAttention(foreground)
  }
  emitEvent(run.window, {
    type: "run.error",
    runId,
    message: code,
    code,
    preOutput: true,
    ...(run.userMessageId || !run.keptUserMessage ? {} : { keptUserMessage: true }),
    ...failedTurnRoute(run, readAgentToolOverrides),
    turn
  })
  return true
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
  const turn = { ...turnOutcomeForRun(run, "error"), attention: "neutral" as const }
  persistTurnWorkflow(run.input.sessionId, turn)
  emitEvent(run.window, {
    type: "run.error",
    runId,
    message: CATCH_UP_APPROVAL_TIMEOUT,
    preOutput: false,
    turn
  })
}
