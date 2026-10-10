/**
 * 旁路 run 不得在 runId 未写入时收轮或新开轮。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  canOpenAssistantTurn,
  isForeignRunId,
  shouldBufferComposerEvent,
  shouldFinalizeComposerRun
} from "./stream-run-scope.ts"

test("旁路 Extract 不得新开助手轮", () => {
  assert.equal(canOpenAssistantTurn("run_extract", null), false)
  assert.equal(shouldFinalizeComposerRun("run_extract", null), false)
  assert.equal(shouldFinalizeComposerRun("run_extract", null, { type: "run.end" }), false)
  assert.equal(isForeignRunId("run_extract", "run_agent"), true)
})

test("空闲时只收回挂家族 run.error", () => {
  assert.equal(
    shouldFinalizeComposerRun("run_wait", null, {
      type: "run.error",
      code: "restore_no_matching_approval"
    }),
    true
  )
  assert.equal(
    shouldFinalizeComposerRun("run_wait", null, {
      type: "run.error",
      message: "restore_restart_cancelled"
    }),
    true
  )
})

test("空闲时标题补全 run.error 不收轮", () => {
  assert.equal(
    shouldFinalizeComposerRun("run_title", null, {
      type: "run.error",
      message: "Request timed out"
    }),
    false
  )
  assert.equal(
    shouldFinalizeComposerRun("run_title", null, {
      type: "run.error",
      message: "Request timed out",
      kind: "completion"
    }),
    false
  )
})

test("当前 composer run 可以挂流式助手并收尾", () => {
  assert.equal(canOpenAssistantTurn("run_1", "run_1"), true)
  assert.equal(shouldFinalizeComposerRun("run_1", "run_1"), true)
  assert.equal(isForeignRunId("run_1", "run_1"), false)
})

test("running 且尚未写入 runId 时缓冲事件", () => {
  assert.equal(shouldBufferComposerEvent(true, null), true)
  assert.equal(shouldBufferComposerEvent(true, "run_1"), false)
  assert.equal(shouldBufferComposerEvent(false, null), false)
})
