/**
 * 流式输出的一侧都不做位移动画。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldSkipHistorySlide } from "./history-slide.ts"

test("任一侧正在输出或用户减少动效时跳过位移", () => {
  assert.equal(shouldSkipHistorySlide({ sourceRunning: false, destinationRunning: false, reduceMotion: false }), false)
  assert.equal(shouldSkipHistorySlide({ sourceRunning: true, destinationRunning: false, reduceMotion: false }), true)
  assert.equal(shouldSkipHistorySlide({ sourceRunning: false, destinationRunning: true, reduceMotion: false }), true)
  assert.equal(shouldSkipHistorySlide({ sourceRunning: false, destinationRunning: false, reduceMotion: true }), true)
})
