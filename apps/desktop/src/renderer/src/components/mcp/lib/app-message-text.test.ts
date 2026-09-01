/**
 * MCP App 回包文本提取。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { textFromAppMessage } from "./app-message-text.ts"

test("textFromAppMessage 只取 string text", () => {
  assert.equal(textFromAppMessage(null), null)
  assert.equal(textFromAppMessage({ method: "ui/log" }), null)
  assert.equal(textFromAppMessage({ text: 1 }), null)
  assert.equal(textFromAppMessage({ text: "ok" }), "ok")
})
