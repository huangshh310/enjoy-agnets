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

test("支持换行分帧且自动忽略 stdout 日志行", () => {
  const raw = Buffer.from(
    "[info] Starting proxy server...\n" +
    JSON.stringify({ jsonrpc: "2.0", id: 10, result: { tools: [] } }) + "\n" +
    JSON.stringify({ jsonrpc: "2.0", id: 11, result: { tools: ["read"] } }) + "\r\n"
  )
  const { messages, rest } = decodeMessages(raw)
  assert.equal(rest.byteLength, 0)
  assert.equal(messages.length, 2)
  assert.equal(messages[0]?.id, 10)
  assert.equal(messages[1]?.id, 11)
})

test("兼容 Content-Length 分帧", () => {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 20, result: { ready: true } })
  const raw = Buffer.from(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`)
  const { messages, rest } = decodeMessages(raw)
  assert.equal(rest.byteLength, 0)
  assert.equal(messages.length, 1)
  assert.equal(messages[0]?.id, 20)
})
