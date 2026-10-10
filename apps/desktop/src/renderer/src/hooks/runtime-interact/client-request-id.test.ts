/**
 * 同一手势复用 clientRequestId；手势结束后再取是新 id。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  peekClientRequestIdForTest,
  releaseClientRequestId,
  resetClientRequestIdForTest,
  takeClientRequestId
} from "./client-request-id.ts"

test("连点同一手势复用 id，释放后再取是新的", () => {
  resetClientRequestIdForTest()
  const first = takeClientRequestId()
  const second = takeClientRequestId()
  assert.equal(first, second)
  assert.equal(peekClientRequestIdForTest(), first)
  releaseClientRequestId(first)
  assert.equal(peekClientRequestIdForTest(), null)
  const third = takeClientRequestId()
  assert.notEqual(third, first)
  releaseClientRequestId(third)
  resetClientRequestIdForTest()
})

test("传入已有 id 覆盖当前手势，给再发一次 / 创建窗续发", () => {
  resetClientRequestIdForTest()
  const owned = takeClientRequestId("req_owned")
  assert.equal(owned, "req_owned")
  assert.equal(takeClientRequestId(), "req_owned")
  releaseClientRequestId("req_owned")
  assert.equal(takeClientRequestId("req_next"), "req_next")
  resetClientRequestIdForTest()
})
