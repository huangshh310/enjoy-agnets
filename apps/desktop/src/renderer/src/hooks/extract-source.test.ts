/**
 * Extract 源文本与聊天模型选择。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { extractSourceText, pickExtractModelId } from "./extract-source.ts"

test("生图轮用上一轮 prompt 当 Extract 源", () => {
  assert.equal(extractSourceText("", "大海的呢"), "大海的呢")
  assert.equal(extractSourceText("  正文  ", "fallback"), "正文")
  assert.equal(extractSourceText("  ", "  "), "")
})

test("Extract 跳过 imagine，改用聊天模型", () => {
  const models = [
    { id: "grok-imagine-image-2.0", capabilities: ["image"] },
    { id: "grok-4.6", capabilities: ["text", "tools"] }
  ]
  assert.equal(pickExtractModelId("grok-imagine-image-2.0", models), "grok-4.6")
  assert.equal(pickExtractModelId("grok-4.6", models), "grok-4.6")
  assert.equal(pickExtractModelId("grok-imagine-image-2.0", models.slice(0, 1)), undefined)
})
