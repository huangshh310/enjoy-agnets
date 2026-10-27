/**
 * COST-P3：EditorModel 单价读写不丢。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { modelRowShowsPrices, visibleModelPriceFields } from "./model-row-prices.ts"
import { providerUpsertPayload, toEditorModel, type EditorState } from "./providers.types.ts"

test("Ollama / LM Studio 不露单价栏，custom 与云端仍露", () => {
  assert.equal(modelRowShowsPrices("ollama"), false)
  assert.equal(modelRowShowsPrices("lmstudio"), false)
  assert.equal(modelRowShowsPrices("custom"), true)
  assert.equal(modelRowShowsPrices("deepseek"), true)
})

test("计费行含推理单价，本地行一栏都不露", () => {
  const keys = (kind: string) => visibleModelPriceFields(kind).map((field) => field.key)
  assert.deepEqual(keys("ollama"), [])
  assert.deepEqual(keys("lmstudio"), [])
  assert.ok(keys("custom").includes("reasoningPricePerMillion"))
  assert.ok(keys("deepseek").includes("reasoningPricePerMillion"))
  assert.equal(keys("deepseek").length, 5)
})

test("toEditorModel 保留 *PricePerMillion", () => {
  const model = toEditorModel({
    id: "deepseek-chat",
    label: "DeepSeek Chat",
    inputPricePerMillion: 0.27,
    outputPricePerMillion: 1.1,
    cacheReadPricePerMillion: 0.07
  })
  assert.equal(model.inputPricePerMillion, 0.27)
  assert.equal(model.outputPricePerMillion, 1.1)
  assert.equal(model.cacheReadPricePerMillion, 0.07)
  assert.equal(model.cacheWritePricePerMillion, undefined)
})

test("providerUpsertPayload 带上模型单价", () => {
  const editor = {
    kind: "deepseek",
    name: "DeepSeek",
    enabled: true,
    endpoints: {},
    baseAPI: "openai",
    modelId: "deepseek-chat",
    models: [
      toEditorModel({
        id: "deepseek-chat",
        inputPricePerMillion: 2,
        outputPricePerMillion: 4
      })
    ],
    keys: [],
    maxTokens: 8192,
    temperature: 0.7,
    customHeaders: "",
    customBody: "",
    proxy: "",
    reasoningFamily: "auto"
  } as unknown as EditorState
  const payload = providerUpsertPayload(editor, false)
  const row = payload.models[0] as {
    inputPricePerMillion?: number
    outputPricePerMillion?: number
  }
  assert.equal(row.inputPricePerMillion, 2)
  assert.equal(row.outputPricePerMillion, 4)
})
