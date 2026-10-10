import assert from "node:assert/strict"
import { test } from "node:test"
import { humanizeModelId, presetModelLabel, resolveModelDisplayName } from "./model-display-name.ts"

test("撤回映射 / 分档模型：预设名优先，否则从 id 读成人话，永不摊 raw id", () => {
  assert.equal(presetModelLabel("claude-sonnet-4-5"), "Claude Sonnet 4.5")
  assert.equal(presetModelLabel("claude-haiku-5-5"), undefined)
  assert.equal(resolveModelDisplayName("claude-sonnet-4-5", ""), "Claude Sonnet 4.5")
  assert.equal(resolveModelDisplayName("claude-haiku-5-5", ""), "Claude Haiku 5.5")
  assert.equal(resolveModelDisplayName("claude-haiku-5-5", "claude-haiku-5-5"), "Claude Haiku 5.5")
  assert.equal(resolveModelDisplayName("claude-haiku-5-5", "Haiku 实验档"), "Haiku 实验档")
  assert.equal(humanizeModelId("claude-haiku-5-5"), "Claude Haiku 5.5")
  assert.notEqual(resolveModelDisplayName("claude-haiku-5-5"), "claude-haiku-5-5")
})

test("斜杠供应商前缀与无分隔短 id 也读成人话", () => {
  assert.equal(resolveModelDisplayName("anthropic/claude-sonnet-4.5"), "Claude Sonnet 4.5")
  assert.equal(humanizeModelId("llama3.1"), "Llama 3.1")
  assert.equal(humanizeModelId("hy3"), "Hy3")
  assert.equal(humanizeModelId("grok-4.6"), "Grok 4.6")
  assert.equal(resolveModelDisplayName("qwen-plus", "qwen-plus"), "Qwen Plus")
  assert.equal(resolveModelDisplayName("ds", "deepseek-v4-flash"), "DeepSeek V4 Flash")
})
