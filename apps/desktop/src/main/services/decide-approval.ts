/**
 * 审批决定：HMAC、清/挂补跑计时器、续泵。
 */
import type { BrowserWindow } from "electron"
import {
  desktopActFailureCode,
  desktopActMayReportSuccess,
  desktopActNeedsSecondConfirm,
  desktopGrantShouldPersist
} from "@enjoy-agents/agent-core/computer-use"
import { applySessionAllowDecision } from "./conversation-session-allow"
import { ASK_USER_QUESTIONS_TOOL, ApprovalDecision, foldToolEvent } from "@enjoy-agents/ipc-contract"
import { APPROVAL_NOT_REATTACHED } from "@enjoy-agents/ipc-contract/approval-decide"
import { peekDesktopObservation } from "./builtin-tools/computer-use/desktop-tools"
import { rememberDesktopAlwaysAllowFromArgs } from "./builtin-tools/computer-use/desktop-always-allow-ledger"
import { approvalResponseMessage } from "./approval-response-message"
import { assertApprovalHmac, recordApprovalDecision, recordSdkApprovalResponse, sdkApprovalIdFor } from "./approval-hmac"
import { persistActiveRun } from "./flush-agent-run"
import { clearCatchUpApprovalTimeout } from "./automations-catchup-timer"
import { armCatchUpPark } from "./park-catch-up-approval"
import { runWithActiveRunId } from "./active-run-id"
import { emitEvent, getActiveRun, type ActiveRun } from "./agent-run-state"
import type { PendingApproval } from "./consume-stream"
import { getDatabase } from "./database"
import { getRun } from "@enjoy-agents/db"
import { isRestoreWaitingSettled } from "./restore-once"

export async function decideApproval(window: BrowserWindow, rawInput: unknown) {
  const decision = ApprovalDecision.parse(rawInput)
  const run = requireActiveRun(decision.runId)
  const pending = requirePendingApproval(run, decision.runId, decision.approvalId)
  // 提问工具没有 Always allow：必须在 HMAC 落库前拒，否则库内行写死、卡片还停着。
  if (
    pending.name === ASK_USER_QUESTIONS_TOOL &&
    (decision.decision === "allow_session" || decision.decision === "allow_always")
  ) {
    throw new Error("ask_user_questions cannot be allow_session")
  }
  assertApprovalHmac({
    runId: decision.runId,
    approvalId: decision.approvalId,
    toolCallId: decision.toolCallId
  })
  recordApprovalDecision(decision.approvalId, decision.decision)
  applyApprovalDecision(run, decision.decision, pending)
  if (pending.name === ASK_USER_QUESTIONS_TOOL && decision.decision !== "deny") {
    run.questionAnswers = decision.answers ?? {}
  }
  if (pending.name === "desktop_act" && decision.decision === "deny") {
    const { releaseParkedDesktopAct } = await import("./builtin-tools/computer-use/desktop-tools")
    releaseParkedDesktopAct(pending.args)
  }
  run.pendingApprovals = run.pendingApprovals.filter(
    (item) => item.approvalId !== decision.approvalId
  )
  if (run.pendingApprovals.length === 0) {
    clearCatchUpApprovalTimeout(decision.runId)
  } else {
    armCatchUpPark(run, decision.runId)
  }
  const hadWaiter = run.approvalGate.resolve(decision.approvalId, decision.decision)
  let desktopResume: Record<string, unknown> | undefined
  if (!hadWaiter && decision.decision !== "deny") {
    const { executeStoredTool } = await import("./execute-stored-tool")
    const outcome = await runWithActiveRunId(decision.runId, () => executeStoredTool(run, pending))
    if (outcome.kind === "desktop_act") desktopResume = outcome.result
  }
  const resolved = {
    type: "approval.resolved" as const,
    runId: decision.runId,
    toolCallId: decision.toolCallId,
    decision: decision.decision
  }
  foldToolEvent(run.tools, resolved)
  const resumeCode = desktopResume ? desktopActFailureCode(desktopResume) : ""
  const desktopResult =
    desktopResume && pending.name === "desktop_act"
      ? {
          type: "tool.result" as const,
          runId: decision.runId,
          toolCallId: decision.toolCallId,
          name: pending.name,
          args: pending.args,
          result: { ...desktopResume, decision: decision.decision },
          error: desktopActMayReportSuccess(desktopResume) ? undefined : resumeCode
        }
      : undefined
  if (desktopResult) foldToolEvent(run.tools, desktopResult)
  persistActiveRun(run, decision.runId, run.pendingApprovals.length > 0 ? "waiting_review" : "running")
  emitEvent(window, resolved)
  if (await maybeReparkSecondConfirm(window, run, decision.runId, pending, desktopResume)) {
    return { ok: true }
  }
  const skipped = pending.name === ASK_USER_QUESTIONS_TOOL && decision.decision === "deny"
  const approved = decision.decision !== "deny" && !resumeCode
  const reason = skipped ? "User skipped questions." : resumeCode || decision.reason
  recordSdkApprovalResponse(decision.approvalId, { approved, reason, resumeCode })
  // 活泵 / 子 Agent waiter：原 SDK id 已经回过 approved，第二张卡不得再 push 同一条。
  if (!hadWaiter) {
    run.messages.push(
      approvalResponseMessage({
        approvalId: sdkApprovalIdFor(decision.approvalId),
        approved,
        reason
      })
    )
  }
  if (desktopResult && (!desktopActMayReportSuccess(desktopResume) || !hadWaiter)) {
    emitEvent(window, desktopResult)
  }
  run.resumeAfterPump = true
  if (!run.pumping) {
    const { pumpStream } = await import("./agent-pump.ts")
    void pumpStream(decision.runId)
  }
  return { ok: true }
}

async function maybeReparkSecondConfirm(
  window: BrowserWindow,
  run: ActiveRun,
  runId: string,
  pending: PendingApproval,
  desktopResume: Record<string, unknown> | undefined
): Promise<boolean> {
  if (pending.name !== "desktop_act") return false
  const { isDesktopSecondConfirmResult } = await import(
    "./builtin-tools/computer-use/desktop-second-confirm-park"
  )
  if (!isDesktopSecondConfirmResult(desktopResume)) return false
  const { reparkDesktopSecondConfirm } = await import("./repark-desktop-second-confirm")
  return reparkDesktopSecondConfirm({
    run,
    runId,
    window,
    pending,
    result: desktopResume ?? {}
  })
}

function applyApprovalDecision(
  run: {
    sessionApprovedTools: Set<string>
    sessionApprovedBashPrefixes: Set<string>
    input: { sessionId: string }
  },
  decision: "allow" | "deny" | "allow_session" | "allow_always",
  pending: { name: string; args?: unknown }
) {
  if (pending.name === ASK_USER_QUESTIONS_TOOL) return
  // allow_always 只写持久簿，不写会话表
  if (decision === "allow_always") {
    applyDesktopAlwaysAllow(pending)
    return
  }
  if (decision !== "allow_session") return
  applySessionAllowDecision(run.input.sessionId, run, pending, peekDesktopObservation)
}

function applyDesktopAlwaysAllow(pending: { name: string; args?: unknown }) {
  if (pending.name !== "desktop_act") return
  if (desktopActNeedsSecondConfirm(pending.args)) return
  if (!desktopGrantShouldPersist(pending.args, peekDesktopObservation)) return
  rememberDesktopAlwaysAllowFromArgs(pending.args)
}

function requireActiveRun(runId: string): ActiveRun {
  const run = getActiveRun(runId)
  if (run) return run
  if (isWaitingRestorePending(runId)) throw new Error(APPROVAL_NOT_REATTACHED)
  throw new Error("This agent run is no longer active.")
}

function requirePendingApproval(run: ActiveRun, runId: string, approvalId: string): PendingApproval {
  const pending = run.pendingApprovals.find((item) => item.approvalId === approvalId)
  if (pending) return pending
  if (isWaitingRestorePending(runId)) throw new Error(APPROVAL_NOT_REATTACHED)
  throw new Error("No matching tool approval is waiting.")
}

function isWaitingRestorePending(runId: string): boolean {
  if (isRestoreWaitingSettled()) return false
  if (getRun(getDatabase(), runId)?.status !== "waiting_review") return false
  const attached = getActiveRun(runId)
  if (!attached) return true
  return attached.pendingApprovals.length === 0
}
