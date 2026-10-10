/**
 * 回放必须走 rememberApproval 落库路径，复现当时发给 SDK 的 response。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { applyRememberedApproval } from "./consume-approval.ts"
import { approvalResponseMessage } from "./approval-response-message.ts"

const {
  rememberApproval,
  rememberReparkApproval,
  recordApprovalDecision,
  recordSdkApprovalResponse,
  sdkApprovalIdFor
} = await import("./approval-sdk-replay.load.ts")

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

test("两个会话用同一个固定 SDK id：两边都弹卡，各自拿到自己的决定", () => {
  const first = {
    approvalId: "apr_fixed",
    runId: "run_session_a",
    toolCallId: "tool_a",
    name: "write_file",
    args: { path: "e2e-stub.txt", content: "from stub" }
  }
  const firstPlan = insertAndDecide(first, "deny", { approved: false, reason: "session a deny" })
  const secondInput = {
    approvalId: "apr_fixed",
    runId: "run_session_b",
    toolCallId: "tool_b",
    name: "write_file",
    args: { path: "e2e-stub.txt", content: "from stub" }
  }
  const second = rememberApproval(secondInput)
  assert.equal(second.action, "insert")
  assert.equal(second.sdkApprovalId, "apr_fixed")
  assert.notEqual(second.id, firstPlan.id)
  const secondCard = applyRememberedApproval(second, {
    toolCallId: "tool_b",
    name: "write_file",
    args: secondInput.args
  })
  assert.equal(secondCard.kind, "open_card")
  if (secondCard.kind !== "open_card") return
  assert.equal(secondCard.pending.approvalId, second.id)
  recordApprovalDecision(second.id, "allow")
  recordSdkApprovalResponse(second.id, { approved: true, reason: "session b allow" })
  assert.equal(sdkApprovalIdFor(firstPlan.id), "apr_fixed")
  assert.equal(sdkApprovalIdFor(second.id), "apr_fixed")
  const firstReplay = replayOriginal(first)
  const secondReplay = replayOriginal(secondInput)
  assert.equal(firstReplay.kind, "replay")
  assert.equal(secondReplay.kind, "replay")
  if (firstReplay.kind !== "replay" || secondReplay.kind !== "replay") return
  assert.equal(firstReplay.approved, false)
  assert.equal(firstReplay.decision, "deny")
  assert.equal(secondReplay.approved, true)
  assert.equal(secondReplay.decision, "allow")
})

test("同一个 run 内 SDK id 碰撞：fail closed", () => {
  rememberApproval({
    approvalId: "apr_fixed",
    runId: "run_collide",
    toolCallId: "tool_one",
    name: "write_file",
    args: { path: "a.txt" }
  })
  const colliding = rememberApproval({
    approvalId: "apr_fixed",
    runId: "run_collide",
    toolCallId: "tool_two",
    name: "write_file",
    args: { path: "b.txt" }
  })
  assert.equal(colliding.action, "fail_closed")
  if (colliding.action === "fail_closed") assert.equal(colliding.cause, "sdk_id_collision")
  const applied = applyRememberedApproval(colliding, {
    toolCallId: "tool_two",
    name: "write_file",
    args: { path: "b.txt" }
  })
  assert.equal(applied.kind, "fail_closed")
  if (applied.kind !== "fail_closed") return
  assert.equal(applied.approvalId, "apr_fixed")
  assert.equal(applied.approved, false)
})

test("重启后发出的 response 带的是原 SDK id", () => {
  const first = insertAndDecide(
    {
      approvalId: "apr_original",
      runId: "run_first",
      toolCallId: "tool_first",
      name: "write_file",
      args: { path: "a.txt" }
    },
    "deny",
    { approved: false }
  )
  const restarted = rememberApproval({
    approvalId: "apr_original",
    runId: "run_restart",
    toolCallId: "tool_restart",
    name: "write_file",
    args: { path: "b.txt" }
  })
  assert.equal(restarted.action, "insert")
  assert.notEqual(restarted.id, first.id)
  assert.equal(restarted.sdkApprovalId, "apr_original")
  recordApprovalDecision(restarted.id, "allow")
  recordSdkApprovalResponse(restarted.id, { approved: true })
  const sdkId = sdkApprovalIdFor(restarted.id)
  assert.equal(sdkId, "apr_original")
  const message = approvalResponseMessage({
    approvalId: sdkId,
    approved: true
  })
  const part = Array.isArray(message.content) ? message.content[0] : undefined
  assert.equal((part as { approvalId?: string }).approvalId, "apr_original")
  assert.notEqual((part as { approvalId?: string }).approvalId, restarted.id)
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
  const first = insertAndDecide(original, "allow")
  const second = rememberReparkApproval({
    existingApprovalId: first.id,
    runId: original.runId,
    toolCallId: original.toolCallId,
    name: original.name,
    args: { observationId: "obs_2", action: "click", needsSecondConfirm: true },
    requestArgs: original.requestArgs
  })
  assert.equal(second.action, "repark")
  assert.notEqual(second.id, first.id)
  assert.equal(second.sdkApprovalId, "apr_repark_orig")
  const applied = replayOriginal(original)
  assert.notEqual(applied.kind === "replay" && applied.approved, true)
  assert.equal(applied.kind === "replay" ? applied.approved : false, false)
})

test("sdkApprovalIdFor 找不到行时 fail closed，不回退内部 id", () => {
  assert.throws(() => sdkApprovalIdFor("apr_missing_row"), /No matching tool approval is waiting/)
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
