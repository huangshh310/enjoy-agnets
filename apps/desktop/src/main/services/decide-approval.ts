/**
 * 审批决定：HMAC、清/挂补跑计时器、续泵。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { bashAllowPrefix, writeThroughDesktopActSessionAllow } from "@enjoy-agents/agent-core"
import {
  desktopActFailureCode,
  desktopActMayReportSuccess,
  desktopActNeedsSecondConfirm,
  desktopGrantShouldPersist
} from "@enjoy-agents/agent-core/computer-use"
import { ASK_USER_QUESTIONS_TOOL, ApprovalDecision } from "@enjoy-agents/ipc-contract"
import { peekDesktopObservation } from "./builtin-tools/computer-use/desktop-tools"
import { rememberDesktopAlwaysAllowFromArgs } from "./builtin-tools/computer-use/desktop-always-allow-ledger"
import { assertApprovalHmac, recordApprovalDecision } from "./approval-hmac"
import { clearCatchUpApprovalTimeout } from "./automations-catchup-timer"
import { armCatchUpPark } from "./park-catch-up-approval"
import { runWithActiveRunId } from "./active-run-id"
import { emitEvent, getActiveRun, type ActiveRun } from "./agent-run-state"
import type { PendingApproval } from "./consume-stream"

export async function decideApproval(window: BrowserWindow, rawInput: unknown) {
  const decision = ApprovalDecision.parse(rawInput)
  const run = getActiveRun(decision.runId)
  if (!run) {
    throw new Error("This agent run is no longer active.")
  }
  const pending = run.pendingApprovals.find((item) => item.approvalId === decision.approvalId)
  if (!pending) {
    throw new Error("No matching tool approval is waiting.")
  }
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
  emitEvent(window, {
    type: "approval.resolved",
    runId: decision.runId,
    toolCallId: decision.toolCallId,
    decision: decision.decision
  })
  if (await maybeReparkSecondConfirm(window, run, decision.runId, pending, desktopResume)) {
    return { ok: true }
  }
  const resumeCode = desktopActFailureCode(desktopResume)
  run.messages.push(approvalResponseMessage(decision, pending.name, resumeCode || undefined))
  if (desktopResume && !desktopActMayReportSuccess(desktopResume)) {
    emitEvent(window, {
      type: "tool.result",
      runId: decision.runId,
      toolCallId: decision.toolCallId,
      name: pending.name,
      args: pending.args,
      result: desktopResume,
      error: resumeCode
    })
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
  await reparkDesktopSecondConfirm({
    run,
    runId,
    window,
    pending,
    result: desktopResume ?? {}
  })
  return true
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
  if (pending.name === "bash" || pending.name === "code_mode") {
    const prefix = bashAllowPrefix(commandFromArgs(pending.args))
    if (prefix) run.sessionApprovedBashPrefixes.add(prefix)
    return
  }
  if (pending.name === "desktop_act") {
    if (desktopActNeedsSecondConfirm(pending.args)) return
    if (!desktopGrantShouldPersist(pending.args, peekDesktopObservation)) return
    writeThroughDesktopActSessionAllow(run.input.sessionId, run.sessionApprovedTools, pending.args)
    return
  }
  run.sessionApprovedTools.add(pending.name)
}

function applyDesktopAlwaysAllow(pending: { name: string; args?: unknown }) {
  if (pending.name !== "desktop_act") return
  if (desktopActNeedsSecondConfirm(pending.args)) return
  if (!desktopGrantShouldPersist(pending.args, peekDesktopObservation)) return
  rememberDesktopAlwaysAllowFromArgs(pending.args)
}

function commandFromArgs(args: unknown): string {
  if (typeof args === "string") return args
  if (args && typeof args === "object" && "command" in args) {
    const command = (args as { command?: unknown }).command
    return typeof command === "string" ? command : ""
  }
  return ""
}

function approvalResponseMessage(
  decision: ApprovalDecision,
  toolName: string,
  resumeError?: string
): ModelMessage {
  const skipped = toolName === ASK_USER_QUESTIONS_TOOL && decision.decision === "deny"
  return {
    role: "tool",
    content: [
      {
        type: "tool-approval-response",
        approvalId: decision.approvalId,
        approved: decision.decision !== "deny" && !resumeError,
        reason: skipped ? "User skipped questions." : resumeError || decision.reason
      }
    ]
  } as ModelMessage
}
