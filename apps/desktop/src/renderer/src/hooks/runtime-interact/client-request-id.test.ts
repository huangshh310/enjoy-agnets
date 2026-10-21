/**
 * 同一手势复用 clientRequestId；手势结束后再取是新 id。按会话各管各的（leo #169 BLOCK）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  abandonInFlightClientRequestId,
  peekClientRequestIdForTest,
  releaseClientRequestId,
  resetClientRequestIdForTest,
  takeClientRequestId
} from "./client-request-id.ts"

test("连点同一手势复用 id，释放后再取是新的", () => {
  resetClientRequestIdForTest()
  const first = takeClientRequestId("ses_a")
  const second = takeClientRequestId("ses_a")
  assert.equal(first, second)
  assert.equal(peekClientRequestIdForTest("ses_a"), first)
  releaseClientRequestId("ses_a", first)
  assert.equal(peekClientRequestIdForTest("ses_a"), null)
  const third = takeClientRequestId("ses_a")
  assert.notEqual(third, first)
  releaseClientRequestId("ses_a", third)
  resetClientRequestIdForTest()
})

test("传入已有 id 覆盖当前手势，给再发一次 / 创建窗续发", () => {
  resetClientRequestIdForTest()
  const owned = takeClientRequestId("ses_a", "req_owned")
  assert.equal(owned, "req_owned")
  assert.equal(takeClientRequestId("ses_a"), "req_owned")
  releaseClientRequestId("ses_a", "req_owned")
  assert.equal(takeClientRequestId("ses_a", "req_next"), "req_next")
  resetClientRequestIdForTest()
})

test("leo #169 BLOCK：只在同一会话里复用——A 在路上时 B 另开 id；放 / 弃都只动自己会话的", () => {
  resetClientRequestIdForTest()
  const a = takeClientRequestId("ses_a")
  const b = takeClientRequestId("ses_b")
  assert.notEqual(b, a, "B 不沿用 A 在路上的 id")
  releaseClientRequestId("ses_a", a)
  assert.equal(peekClientRequestIdForTest("ses_b"), b, "A 先跑完放掉自己的，不清 B 的")
  releaseClientRequestId("ses_a", b)
  assert.equal(peekClientRequestIdForTest("ses_b"), b, "拿 B 的 id 去放 A 会话：也不动 B")
  const a2 = takeClientRequestId("ses_a")
  assert.equal(abandonInFlightClientRequestId("ses_b"), b, "B 里停止交出 B 的 id")
  assert.equal(peekClientRequestIdForTest("ses_a"), a2, "A 的 id 原样挂着")
  assert.equal(abandonInFlightClientRequestId("ses_b"), null)
  resetClientRequestIdForTest()
})
