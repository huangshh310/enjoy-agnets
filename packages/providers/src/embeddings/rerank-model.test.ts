import assert from "node:assert/strict"
import { test } from "node:test"
import { createRerankModel, defaultRerankModelId } from "./rerank-model.ts"

test("Cohere 默认 rerank 模型", () => {
  assert.equal(defaultRerankModelId("cohere"), "rerank-english-v3.0")
  assert.equal(defaultRerankModelId("openai", "rerank-v3.5"), "rerank-v3.5")
})

test("非 Cohere 且模型名不含 rerank 时不建工厂", () => {
  assert.equal(
    createRerankModel({ provider: "openai", apiKey: "k", modelId: "gpt-4o" }),
    undefined
  )
})

test("Cohere 返回 reranking 模型对象", () => {
  const model = createRerankModel({
    provider: "cohere",
    apiKey: "k",
    modelId: "rerank-english-v3.0"
  }) as { modelId?: string } | undefined
  assert.ok(model)
  assert.equal(model?.modelId, "rerank-english-v3.0")
})
