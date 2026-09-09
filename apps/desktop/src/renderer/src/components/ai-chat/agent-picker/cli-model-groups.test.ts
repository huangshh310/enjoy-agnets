/**
 * CLI 模型按 provider/model 分组。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  formatCliProviderLabel,
  groupCliModels,
  initialCliProviderKey,
  providerKeyOf,
  shouldSplitCliProviders
} from "./cli-model-groups.ts"

test("从 selector 取出供应商，无斜杠不算供应商", () => {
  assert.equal(providerKeyOf("google-antigravity/gemini-3.6-flash"), "google-antigravity")
  assert.equal(providerKeyOf("gemini-3.8-flash-high"), "")
})

test("两家及以上供应商才分栏", () => {
  const models = [
    { id: "google-antigravity/gemini-3.6-flash", label: "Gemini 3.6 Flash" },
    { id: "openai/gpt-5.4", label: "GPT-5.4" }
  ]
  assert.equal(shouldSplitCliProviders(models), true)
  assert.equal(shouldSplitCliProviders(models.slice(0, 1)), false)
  assert.deepEqual(
    groupCliModels(models).map((group) => group.key),
    ["google-antigravity", "openai"]
  )
  assert.equal(formatCliProviderLabel("google-antigravity"), "Google Antigravity")
})

test("默认打开选中模型所在供应商", () => {
  const models = [
    { id: "google-antigravity/gemini-3.6-flash", label: "Flash" },
    { id: "openai/gpt-5.4", label: "GPT" }
  ]
  assert.equal(initialCliProviderKey(models, "openai/gpt-5.4"), "openai")
  assert.equal(initialCliProviderKey(models), "google-antigravity")
})
