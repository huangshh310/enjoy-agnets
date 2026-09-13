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

test("新增国产与国际主流预设（豆包、千帆、混元、阶跃、Grok、Mistral 等）走兼容层", () => {
  assert.equal(
    languageModelFactoryKind({ provider: "doubao", modelId: "doubao-1-5-pro-32k" }),
    "openai-compatible"
  )
  assert.equal(
    languageModelFactoryKind({ provider: "wenxin", modelId: "ernie-4.0-turbo-8k" }),
    "openai-compatible"
  )
  assert.equal(
    languageModelFactoryKind({ provider: "hunyuan", modelId: "hunyuan-turbo" }),
    "openai-compatible"
  )
  assert.equal(
    languageModelFactoryKind({ provider: "stepfun", modelId: "step-2-16k" }),
    "openai-compatible"
  )
  assert.equal(
    languageModelFactoryKind({ provider: "xai", modelId: "grok-2-latest" }),
    "openai-compatible"
  )
  assert.equal(
    languageModelFactoryKind({ provider: "mistral", modelId: "codestral-latest" }),
    "openai-compatible"
  )
})


