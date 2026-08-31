import assert from "node:assert/strict"
import { test } from "node:test"
import { deepseekCallOptions, isDeepSeekModelId, usesDeepSeekReasoningApi } from "./reasoning.ts"

test("detects DeepSeek V4, slugs, and OpenRouter ids", () => {
  assert.equal(isDeepSeekModelId("deepseek-v4-flash"), true)
  assert.equal(isDeepSeekModelId("deepseek-v4-pro"), true)
  assert.equal(isDeepSeekModelId("deepseek-chat"), true)
  assert.equal(isDeepSeekModelId("deepseek/deepseek-chat"), true)
  assert.equal(isDeepSeekModelId("deepseek-ai/DeepSeek-V4-Flash"), true)
  assert.equal(isDeepSeekModelId("gpt-4.1"), false)
})

test("official DeepSeek provider always uses DeepSeek reasoning API", () => {
  assert.equal(
    usesDeepSeekReasoningApi({ provider: "deepseek", modelId: "deepseek-v4-flash" }),
    true
  )
})

test("OpenRouter / siliconflow DeepSeek models use DeepSeek reasoning API", () => {
  assert.equal(
    usesDeepSeekReasoningApi({
      provider: "openrouter",
      modelId: "deepseek/deepseek-chat"
    }),
    true
  )
  assert.equal(
    usesDeepSeekReasoningApi({
      provider: "siliconflow",
      modelId: "deepseek-ai/DeepSeek-V4-Flash"
    }),
    true
  )
})

test("official OpenAI and Anthropic style stay on their own providers", () => {
  assert.equal(
    usesDeepSeekReasoningApi({ provider: "openai", modelId: "deepseek-v4-flash" }),
    false
  )
  assert.equal(
    usesDeepSeekReasoningApi({
      provider: "deepseek",
      modelId: "deepseek-v4-flash",
      apiStyle: "anthropic"
    }),
    false
  )
})

test("deepseekCallOptions enables thinking and forwards effort", () => {
  assert.deepEqual(deepseekCallOptions(), {
    deepseek: { thinking: { type: "enabled" } }
  })
  assert.deepEqual(deepseekCallOptions("high"), {
    deepseek: { thinking: { type: "enabled" }, reasoningEffort: "high" }
  })
})
