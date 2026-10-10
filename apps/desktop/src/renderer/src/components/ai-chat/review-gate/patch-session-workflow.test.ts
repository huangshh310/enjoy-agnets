/**
 * renderer 不得把待验收覆写成执行中 / 待办；运行中只靠 running。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { nextLocalSessionWorkflow } from "./next-local-session-workflow.ts"
import { reviewGatePhase } from "./review-gate-phase.ts"

test("只读轮收工：侧栏 / 看板 / Inbox 仍待验收", () => {
  assert.equal(nextLocalSessionWorkflow("needs_review", "todo"), null)
  assert.equal(nextLocalSessionWorkflow("needs_review", "in_progress"), null)
  assert.equal(reviewGatePhase({ running: false, workflowStatus: "needs_review" }), "needs_review")
})

test("运行中只靠 running，不改工单", () => {
  assert.equal(reviewGatePhase({ running: true, workflowStatus: "needs_review" }), "running")
  assert.equal(nextLocalSessionWorkflow("needs_review", "in_progress"), null)
})

test("人点通过 / 打回仍可改", () => {
  assert.equal(nextLocalSessionWorkflow("needs_review", "done"), "done")
  assert.equal(nextLocalSessionWorkflow("todo", "in_progress"), "in_progress")
})
