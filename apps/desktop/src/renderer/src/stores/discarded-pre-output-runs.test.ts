/**
 * 出字前回滚后记住 runId。禁止 value-import chat-store（合约桶入口，node:test 加载不到）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isDiscardedPreOutputRun,
  rememberDiscardedPreOutputRun,
  resetDiscardedPreOutputRunsForTest
} from "./discarded-pre-output-runs.ts"

test("记住已回滚的 runId；空 id 不记", () => {
  resetDiscardedPreOutputRunsForTest()
  rememberDiscardedPreOutputRun(undefined)
  rememberDiscardedPreOutputRun("")
  assert.equal(isDiscardedPreOutputRun(undefined), false)
  assert.equal(isDiscardedPreOutputRun(""), false)
  rememberDiscardedPreOutputRun("run_late")
  assert.equal(isDiscardedPreOutputRun("run_late"), true)
  assert.equal(isDiscardedPreOutputRun("run_other"), false)
})

test("同一 runId 只记一次，超过 8 个丢掉最早的", () => {
  resetDiscardedPreOutputRunsForTest()
  rememberDiscardedPreOutputRun("run_late")
  rememberDiscardedPreOutputRun("run_late")
  for (let i = 0; i < 8; i++) rememberDiscardedPreOutputRun(`run_${i}`)
  assert.equal(isDiscardedPreOutputRun("run_late"), false)
  assert.equal(isDiscardedPreOutputRun("run_0"), true)
  assert.equal(isDiscardedPreOutputRun("run_7"), true)
})
