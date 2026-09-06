import assert from "node:assert/strict"
import { test } from "node:test"
import { languageModelFactoryKind } from "./model-factory.ts"

test("官方 OpenAI 走 createOpenAI，自定义网关走 openai-compatible", () => {
  assert.equal(
    languageModelFactoryKind({ provider: "openai", modelId: "gpt-4.1" }),
    "openai"
  )
  assert.equal(
    languageModelFactoryKind({
      provider: "openai",
      modelId: "minimax-m3",
      baseURL: "https://api.lucky.example/v1"
    }),
    "openai-compatible"
  )
})

test("自定义 /v1 与 MiniMax / Kimi / GLM 走兼容层，才能解析 reasoning_content", () => {
  assert.equal(
    languageModelFactoryKind({ provider: "custom", modelId: "minimax-m3" }),
    "openai-compatible"
  )
  assert.equal(
    languageModelFactoryKind({ provider: "minimax", modelId: "MiniMax-M2" }),
    "openai-compatible"
  )
  assert.equal(
    languageModelFactoryKind({ provider: "kimi", modelId: "kimi-k3" }),
    "openai-compatible"
  )
  assert.equal(
    languageModelFactoryKind({ provider: "zhipu", modelId: "glm-5.3-flash" }),
    "openai-compatible"
  )
})

test("DeepSeek 思考模型仍走 @ai-sdk/deepseek", () => {
  assert.equal(
    languageModelFactoryKind({ provider: "custom", modelId: "deepseek-v4-flash" }),
    "deepseek"
  )
})
