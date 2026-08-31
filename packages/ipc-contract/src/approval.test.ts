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
