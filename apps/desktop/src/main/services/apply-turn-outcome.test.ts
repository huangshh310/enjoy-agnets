/**
 * needs_review 粘性：开跑 in_progress / 只读 todo 都不得擦掉。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldWriteSessionWorkflow, stickyTurnOutcome } from "./session-workflow-sticky.ts"

test("待验收时开跑不写 in_progress", () => {
  assert.equal(shouldWriteSessionWorkflow("needs_review", "in_progress"), false)
})

test("待验收时只读轮收工不回 todo", () => {
  assert.equal(shouldWriteSessionWorkflow("needs_review", "todo"), false)
})

test("待验收可保持或由人通过后另写 done", () => {
  assert.equal(shouldWriteSessionWorkflow("needs_review", "needs_review"), true)
  assert.equal(shouldWriteSessionWorkflow("todo", "in_progress"), true)
  assert.equal(shouldWriteSessionWorkflow("in_progress", "todo"), true)
})

test("只读轮收工：turn 仍回填 needs_review", () => {
  const sticky = stickyTurnOutcome({ workflow: "todo", attention: "complete" }, "needs_review")
  assert.deepEqual(sticky, { workflow: "needs_review", attention: "complete" })
})

test("无待验收时只读轮照常回 todo", () => {
  assert.deepEqual(stickyTurnOutcome({ workflow: "todo", attention: "complete" }, "todo"), {
    workflow: "todo",
    attention: "complete"
  })
})
