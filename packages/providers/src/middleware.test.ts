import assert from "node:assert/strict"
import { test } from "node:test"
import { mergeModelSettings } from "./middleware.ts"

test("mergeModelSettings 覆盖默认值", () => {
  const merged = mergeModelSettings(
    { temperature: 0.2, maxTokens: 100, instructions: "base" },
    { temperature: 0.8 }
  )
  assert.equal(merged.temperature, 0.8)
  assert.equal(merged.maxTokens, 100)
  assert.equal(merged.instructions, "base")
})
