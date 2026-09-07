/**
 * Agent 编排入口：启动 / 中止 / 审批。泵与内存态在独立模块。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { AbortAgentInput, ApprovalDecision } from "@enjoy-agents/ipc-contract"
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

export { createSession, listMessages, listSessions } from "./session-queries"
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
  assertApprovalHmac({
    runId: decision.runId,
    approvalId: decision.approvalId,
    toolCallId: decision.toolCallId
  })
  recordApprovalDecision(decision.approvalId, decision.decision)
  applyApprovalDecision(run, decision.decision, pending.name)
  run.pendingApprovals = run.pendingApprovals.filter(
    (item) => item.approvalId !== decision.approvalId
  )
  run.approvalGate.resolve(decision.approvalId, decision.decision)
  run.messages.push(approvalResponseMessage(decision))
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
  run: { sessionApprovedTools: Set<string> },
  decision: "allow" | "deny" | "allow_session",
  toolName: string
) {
  if (decision === "allow_session") run.sessionApprovedTools.add(toolName)
}

function approvalResponseMessage(decision: ApprovalDecision): ModelMessage {
  return {
    role: "tool",
    content: [
      {
        type: "tool-approval-response",
        approvalId: decision.approvalId,
        approved: decision.decision !== "deny",
        reason: decision.reason
      }
    ]
  } as ModelMessage
}
