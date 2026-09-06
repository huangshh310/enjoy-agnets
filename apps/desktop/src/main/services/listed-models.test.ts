import assert from "node:assert/strict"
import { test } from "node:test"
import { listedModelsFromProfiles } from "./listed-models.ts"

test("空档案不回退任何预设模型", () => {
  const listed = listedModelsFromProfiles([], null, () => [
    { id: "deepseek-chat", provider: "deepseek" }
  ])
  assert.deepEqual(listed, [])
})

test("只列出已配置档案，并标记当前供应商", () => {
  const listed = listedModelsFromProfiles(
    [{ id: "prv_openai" }],
    "prv_openai",
    (profile, active) => [
      { id: "gpt-4.1", provider: "openai", providerId: profile.id, active }
    ]
  )
  assert.deepEqual(listed, [
    { id: "gpt-4.1", provider: "openai", providerId: "prv_openai", active: true }
  ])
})
