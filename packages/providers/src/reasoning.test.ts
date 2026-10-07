import assert from "node:assert/strict"
import { test } from "node:test"
import {
  OPENAI_COMPAT_NAME,
  deepseekCallOptions,
  glmThinkingOptions,
  isDeepSeekModelId,
  isGlmModelId,
  isKimiModelId,
  isMiniMaxModelId,
  isOfficialMiniMaxHost,
  miniMaxThinkingOptions,
  reasoningCallOptions,
  usesDeepSeekReasoningApi
} from "./reasoning.ts"

test("detects DeepSeek V4, slugs, and OpenRouter ids", () => {
  assert.equal(isDeepSeekModelId("deepseek-v4-flash"), true)
  assert.equal(isDeepSeekModelId("deepseek-v4-pro"), true)
  assert.equal(isDeepSeekModelId("deepseek-chat"), true)
  assert.equal(isDeepSeekModelId("deepseek/deepseek-chat"), true)
  assert.equal(isDeepSeekModelId("deepseek-ai/DeepSeek-V4-Flash"), true)
  assert.equal(isDeepSeekModelId("gpt-4.1"), false)
})

test("detects MiniMax / Kimi / GLM ids", () => {
  assert.equal(isMiniMaxModelId("minimax-m3"), true)
  assert.equal(isMiniMaxModelId("MiniMax-M2"), true)
  assert.equal(isMiniMaxModelId("kimi-k3"), false)
  assert.equal(isKimiModelId("kimi-k3"), true)
  assert.equal(isKimiModelId("moonshot-v1"), true)
  assert.equal(isGlmModelId("glm-5.3-flash"), true)
  assert.equal(isGlmModelId("kimi-k3"), false)
})

test("official DeepSeek provider always uses DeepSeek reasoning API", () => {
  assert.equal(
    usesDeepSeekReasoningApi({ provider: "deepseek", modelId: "deepseek-v4-flash" }),
    true
  )
})

test("中转上的 DeepSeek 模型名不进 DeepSeek 官方工厂", () => {
  assert.equal(
    usesDeepSeekReasoningApi({
      provider: "openrouter",
      modelId: "deepseek/deepseek-chat"
    }),
    false
  )
  assert.equal(
    usesDeepSeekReasoningApi({
      provider: "siliconflow",
      modelId: "deepseek-ai/DeepSeek-V4-Flash"
    }),
    false
  )
  assert.equal(
    usesDeepSeekReasoningApi({
      provider: "custom",
      modelId: "deepseek-v4-flash"
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

test("中转 MiniMax 只发 thinking.adaptive，不发 reasoning_split", () => {
  assert.equal(isOfficialMiniMaxHost("https://api.lucky.example/v1"), false)
  const adaptive = reasoningCallOptions({
    provider: "custom",
    modelId: "minimax-m3",
    effort: "xhigh",
    baseURL: "https://api.lucky.example/v1"
  })
  assert.equal(adaptive.reasoning, undefined)
  assert.deepEqual(adaptive.providerOptions, miniMaxThinkingOptions("xhigh", "https://api.lucky.example/v1"))
  assert.equal(adaptive.providerOptions?.[OPENAI_COMPAT_NAME]?.reasoning_split, undefined)
  assert.deepEqual(adaptive.providerOptions?.[OPENAI_COMPAT_NAME]?.thinking, { type: "adaptive" })
})

test("官方 MiniMax 才发 reasoning_split", () => {
  assert.equal(isOfficialMiniMaxHost("https://api.minimax.io/v1"), true)
  const official = reasoningCallOptions({
    provider: "minimax",
    modelId: "MiniMax-M3",
    effort: "high",
    baseURL: "https://api.minimax.io/v1"
  })
  assert.equal(official.providerOptions?.[OPENAI_COMPAT_NAME]?.reasoning_split, true)
  assert.deepEqual(official.providerOptions?.[OPENAI_COMPAT_NAME]?.thinking, { type: "adaptive" })
})

test("Kimi K3 走 SDK 顶层 reasoning（官方 thinking 字段是 —）", () => {
  assert.deepEqual(
    reasoningCallOptions({ provider: "custom", modelId: "kimi-k3", effort: "high" }),
    { reasoning: "high" }
  )
})

test("GLM 走 thinking.enabled + reasoningEffort，不靠顶层 reasoning", () => {
  const options = reasoningCallOptions({
    provider: "zhipu",
    modelId: "glm-5.3-flash",
    effort: "medium"
  })
  assert.equal(options.reasoning, undefined)
  assert.deepEqual(options.providerOptions, glmThinkingOptions("medium"))
  assert.deepEqual(options.providerOptions?.[OPENAI_COMPAT_NAME], {
    thinking: { type: "enabled" },
    reasoningEffort: "medium"
  })
})

test("未选思考档时中转 MiniMax / GLM 不强制 disabled，也不发 reasoning_split", () => {
  assert.deepEqual(
    reasoningCallOptions({
      provider: "custom",
      modelId: "minimax-m3",
      baseURL: "https://api.lucky.example/v1"
    }),
    {}
  )
  assert.deepEqual(
    reasoningCallOptions({ provider: "zhipu", modelId: "glm-5.3-flash" }),
    {}
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
