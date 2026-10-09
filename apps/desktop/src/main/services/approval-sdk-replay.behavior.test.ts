/**
 * 回放必须走 rememberApproval 落库路径，复现当时发给 SDK 的 response。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { applyRememberedApproval } from "./consume-approval.ts"

const { rememberApproval, recordApprovalDecision, recordSdkApprovalResponse } = await import(
  "./approval-sdk-replay.load.ts"
)

function replayOriginal(input: {
  approvalId: string
  runId: string
  toolCallId: string
  name: string
  args: unknown
  requestArgs?: unknown
}) {
  const plan = rememberApproval(input)
  return applyRememberedApproval(plan, {
    toolCallId: input.toolCallId,
    name: input.name,
    args: input.args
  })
}

test("二次确认 repark 后 SDK 重发原 id：不得回放 approved true", () => {
  const original = {
    approvalId: "apr_repark_orig",
    runId: "run_repark",
    toolCallId: "tool_repark",
    name: "desktop_act",
    args: { observationId: "obs_1", action: "click" },
    requestArgs: { observationId: "obs_1", action: "click" }
  }
  assert.equal(rememberApproval(original).action, "insert")
  recordApprovalDecision(original.approvalId, "allow")
  // repark 只把 allow 记在原 id，从不发 tool-approval-response。
  const applied = replayOriginal(original)
  assert.notEqual(applied.kind === "replay" && applied.approved, true)
  assert.equal(applied.kind === "replay" ? applied.approved : false, false)
})

test("带 resumeCode 的 id 被重发：不得得到 approved true", () => {
  const input = {
    approvalId: "apr_resume_stale",
    runId: "run_resume",
    toolCallId: "tool_resume",
    name: "desktop_act",
    args: { observationId: "obs_2", action: "click" },
    requestArgs: { observationId: "obs_2", action: "click" }
  }
  assert.equal(rememberApproval(input).action, "insert")
  recordApprovalDecision(input.approvalId, "allow")
  recordSdkApprovalResponse(input.approvalId, {
    approved: false,
    reason: "stale_observation",
    resumeCode: "stale_observation"
  })
  const applied = replayOriginal(input)
  assert.notEqual(applied.kind === "replay" && applied.approved, true)
  assert.equal(applied.kind === "replay" ? applied.approved : false, false)
})

test("desktop_act 回放 allow：不得得到 approved true", () => {
  const input = {
    approvalId: "apr_desktop_allow",
    runId: "run_desktop_allow",
    toolCallId: "tool_desktop_allow",
    name: "desktop_act",
    args: { observationId: "obs_3", action: "type" },
    requestArgs: { observationId: "obs_3", action: "type" }
  }
  assert.equal(rememberApproval(input).action, "insert")
  recordApprovalDecision(input.approvalId, "allow")
  recordSdkApprovalResponse(input.approvalId, { approved: true, reason: "user allow" })
  const applied = replayOriginal(input)
  assert.notEqual(applied.kind === "replay" && applied.approved, true)
  assert.equal(applied.kind === "replay" ? applied.approved : false, false)
})
