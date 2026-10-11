/**
 * 助手行归属：有 runId 只认信封；没有则 createdAt 必须同时满足。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { assistantBelongsToRun } from "./restore-assistant-snapshot.ts"

test("信封 runId 对上才属于本轮，对不上不封邻轮", () => {
  assert.equal(
    assistantBelongsToRun(50, 10, 20, { runId: "run_a", envelopeRunId: "run_a" }),
    true
  )
  assert.equal(
    assistantBelongsToRun(50, 10, 20, { runId: "run_new", envelopeRunId: "run_old" }),
    false
  )
})

test("没有 runId 时 createdAt 必须同时晚于用户句且 ≥ run", () => {
  assert.equal(assistantBelongsToRun(30, 10, 20), true)
  assert.equal(assistantBelongsToRun(15, 10, 20), false)
  assert.equal(assistantBelongsToRun(25, 40, 20), false)
})
