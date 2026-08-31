import assert from "node:assert/strict"
import { test } from "node:test"
import { decodeMessages, encodeMessage, initializeRequest } from "./stdio-rpc.ts"

test("分帧后可还原 initialize", () => {
  const framed = encodeMessage(initializeRequest(3))
  const { messages, rest } = decodeMessages(framed)
  assert.equal(rest.byteLength, 0)
  assert.equal(messages[0]?.id, 3)
})

test("半包不会提前解析", () => {
  const framed = encodeMessage({ jsonrpc: "2.0", id: 1, result: { ok: true } })
  const { messages, rest } = decodeMessages(framed.subarray(0, 12))
  assert.equal(messages.length, 0)
  assert.ok(rest.byteLength > 0)
})
