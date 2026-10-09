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

function insertAndDecide(
  input: {
    approvalId: string
    runId: string
    toolCallId: string
    name: string
    args: unknown
    requestArgs?: unknown
  },
  decision: string,
  response?: { approved: boolean; reason?: string; resumeCode?: string }
) {
  const plan = rememberApproval(input)
  assert.equal(plan.action, "insert")
  recordApprovalDecision(plan.id, decision)
  if (response) recordSdkApprovalResponse(plan.id, response)
  return plan
}

test("两个不同 run 用同一个 SDK id：第二个仍弹卡，回应带原 id", () => {
  const first = {
    approvalId: "apr_shared",
    runId: "run_a",
    toolCallId: "tool_a",
    name: "write_file",
    args: { path: "e2e-stub.txt", content: "from stub" }
  }
  const firstPlan = insertAndDecide(first, "deny", { approved: false })
  const second = rememberApproval({
    approvalId: "apr_shared",
    runId: "run_b",
    toolCallId: "tool_b",
    name: "write_file",
    args: { path: "e2e-stub.txt", content: "from stub" }
  })
  assert.equal(second.action, "insert")
  assert.equal(second.sdkApprovalId, "apr_shared")
  assert.notEqual(second.id, firstPlan.id)
  const applied = applyRememberedApproval(second, {
    toolCallId: "tool_b",
    name: "write_file",
    args: { path: "e2e-stub.txt", content: "from stub" }
  })
  assert.equal(applied.kind, "open_card")
  if (applied.kind !== "open_card") return
  assert.equal(applied.pending.approvalId, second.id)
})

test("同一 run、同一 toolCall 重发：仍按上轮规则回放", () => {
  const input = {
    approvalId: "apr_same_run",
    runId: "run_same",
    toolCallId: "tool_same",
    name: "write_file",
    args: { path: "e2e-stub.txt", content: "from stub" }
  }
  insertAndDecide(input, "deny", { approved: false, reason: "user deny" })
  const applied = replayOriginal(input)
  assert.equal(applied.kind, "replay")
  if (applied.kind !== "replay") return
  assert.equal(applied.approvalId, "apr_same_run")
  assert.equal(applied.approved, false)
})

test("二次确认 repark 后 SDK 重发原 id：不得回放 approved true", () => {
  const original = {
    approvalId: "apr_repark_orig",
    runId: "run_repark",
    toolCallId: "tool_repark",
    name: "desktop_act",
    args: { observationId: "obs_1", action: "click" },
    requestArgs: { observationId: "obs_1", action: "click" }
  }
  insertAndDecide(original, "allow")
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
  insertAndDecide(input, "allow", {
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
  insertAndDecide(input, "allow", { approved: true, reason: "user allow" })
  const applied = replayOriginal(input)
  assert.notEqual(applied.kind === "replay" && applied.approved, true)
  assert.equal(applied.kind === "replay" ? applied.approved : false, false)
})
