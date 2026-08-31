/**
 * 生图轮不画空 Thinking。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldShowThinkingTrace } from "./thinking-visibility.ts"

test("生图轮不画空 Thinking", () => {
  assert.equal(
    shouldShowThinkingTrace({ reasoning: "", toolCount: 0, streaming: true, mediaSurface: true }),
    false
  )
  assert.equal(
    shouldShowThinkingTrace({ reasoning: "", toolCount: 0, streaming: false, mediaSurface: true }),
    false
  )
})

test("Agent 流式或有推理 / 工具才画 Thinking", () => {
  assert.equal(
    shouldShowThinkingTrace({ reasoning: "", toolCount: 0, streaming: true, mediaSurface: false }),
    true
  )
  assert.equal(
    shouldShowThinkingTrace({ reasoning: "plan", toolCount: 0, streaming: false, mediaSurface: false }),
    true
  )
  assert.equal(
    shouldShowThinkingTrace({ reasoning: "", toolCount: 1, streaming: false, mediaSurface: false }),
    true
  )
  assert.equal(
    shouldShowThinkingTrace({ reasoning: "", toolCount: 0, streaming: false, mediaSurface: false }),
    false
  )
})
