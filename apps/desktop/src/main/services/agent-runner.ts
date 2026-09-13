/**
 * Agent 编排入口：启动 / 中止 / 审批。泵与内存态在独立模块。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { bashAllowPrefix } from "@enjoy-agents/agent-core"
import { ASK_USER_QUESTIONS_TOOL, AbortAgentInput, ApprovalDecision } from "@enjoy-agents/ipc-contract"
import { assertApprovalHmac, recordApprovalDecision } from "./approval-hmac"
import { persistActiveRun } from "./flush-agent-run"
import { disposeCodingStream } from "./open-coding-stream"
import { pumpStream } from "./agent-pump"
import { clearSteer } from "./runtime-interact/steering-queue"
import {
  deleteActiveRun,
  emitEvent,
  getActiveRun
} from "./agent-run-state"

export { createSession, listMessages, listSessions, patchSession } from "./session-queries"
export { runAgent, resumeAgentRun } from "./agent-run-start"
export { steerAgent } from "./runtime-interact/steer-agent"
export { emitEvent, holdAgentRun } from "./agent-run-state"
export { pumpStream } from "./agent-pump"

export async function abortAgent(rawInput: unknown) {
  const { runId } = AbortAgentInput.parse(
    typeof rawInput === "string" ? { runId: rawInput } : rawInput
  )
  const run = getActiveRun(runId)
  if (run) {
    persistActiveRun(run, runId, "cancelled")
    clearSteer(run.input.sessionId)
  }
  run?.abort.abort()
  deleteActiveRun(runId)
  await disposeCodingStream(runId)
  return { ok: true }
}

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
  if (pending.name === ASK_USER_QUESTIONS_TOOL && decision.decision === "allow_session") {
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
  run.pendingApprovals = run.pendingApprovals.filter(
    (item) => item.approvalId !== decision.approvalId
  )
  const hadWaiter = run.approvalGate.resolve(decision.approvalId, decision.decision)
  if (!hadWaiter && decision.decision !== "deny") {
    const { executeStoredTool } = await import("./execute-stored-tool")
    await executeStoredTool(run, pending)
  }
  run.messages.push(approvalResponseMessage(decision, pending.name))
  emitEvent(window, {
    type: "approval.resolved",
    runId: decision.runId,
    toolCallId: decision.toolCallId,
    decision: decision.decision
  })
  run.resumeAfterPump = true
  if (!run.pumping) {
    void pumpStream(decision.runId)
  }
  return { ok: true }
}

function applyApprovalDecision(
  run: { sessionApprovedTools: Set<string>; sessionApprovedBashPrefixes: Set<string> },
  decision: "allow" | "deny" | "allow_session",
  pending: { name: string; args?: unknown }
) {
  if (pending.name === ASK_USER_QUESTIONS_TOOL) return
  if (decision !== "allow_session") return
  if (pending.name === "bash" || pending.name === "code_mode") {
    const prefix = bashAllowPrefix(commandFromArgs(pending.args))
    if (prefix) run.sessionApprovedBashPrefixes.add(prefix)
    return
  }
  run.sessionApprovedTools.add(pending.name)
}

function commandFromArgs(args: unknown): string {
  if (typeof args === "string") return args
  if (args && typeof args === "object" && "command" in args) {
    const command = (args as { command?: unknown }).command
    return typeof command === "string" ? command : ""
  }
  return ""
}

function approvalResponseMessage(decision: ApprovalDecision, toolName: string): ModelMessage {
  const skipped = toolName === ASK_USER_QUESTIONS_TOOL && decision.decision === "deny"
  return {
    role: "tool",
    content: [
      {
        type: "tool-approval-response",
        approvalId: decision.approvalId,
        approved: decision.decision !== "deny",
        reason: skipped ? "User skipped questions." : decision.reason
      }
    ]
  } as ModelMessage
}
