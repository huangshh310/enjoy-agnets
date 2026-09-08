import assert from "node:assert/strict"
import { test } from "node:test"
import { ApprovalDecision } from "./approval.ts"

test("ApprovalDecision 拒绝未知字段，含多余 args", () => {
  assert.equal(
    ApprovalDecision.safeParse({
      runId: "r1",
      toolCallId: "t1",
      approvalId: "a1",
      decision: "allow",
      args: { path: "secret" }
    }).success,
    false
  )
  assert.equal(
    ApprovalDecision.safeParse({
      runId: "r1",
      toolCallId: "t1",
      approvalId: "a1",
      decision: "allow"
    }).success,
    true
  )
})

test("ApprovalDecision 拒绝 answers 搭配 allow_session", () => {
  assert.equal(
    ApprovalDecision.safeParse({
      runId: "r1",
      toolCallId: "t1",
      approvalId: "a1",
      decision: "allow_session",
      answers: { "q-1": { questionId: "q-1", selectedIds: ["o-1"] } }
    }).success,
    false
  )
})

test("ApprovalDecision 允许无 answers 的 allow_session（写盘工具）", () => {
  assert.equal(
    ApprovalDecision.safeParse({
      runId: "r1",
      toolCallId: "t1",
      approvalId: "a1",
      decision: "allow_session"
    }).success,
    true
  )
})

test("ApprovalDecision 允许 ask_user_questions 的 answers", () => {
  assert.equal(
    ApprovalDecision.safeParse({
      runId: "r1",
      toolCallId: "t1",
      approvalId: "a1",
      decision: "allow",
      answers: {
        "q-1": { questionId: "q-1", selectedIds: ["o-1"] }
      }
    }).success,
    true
  )
})
