import assert from "node:assert/strict"
import { test } from "node:test"
import { mapUsageTokens } from "./map-usage.ts"

test("缓存和推理没返回时是未知而不是 0", () => {
  const mapped = mapUsageTokens({ inputTokens: 3, outputTokens: 5, totalTokens: 8 })
  assert.deepEqual(mapped, {
    inputTokens: 3,
    outputTokens: 5,
    totalTokens: 8
  })
  assert.equal(mapped && "cacheReadTokens" in mapped, false)
  assert.equal(mapped && "noCacheTokens" in mapped, false)
  assert.equal(mapped && "reasoningTokens" in mapped, false)
})

test("AI SDK v7 inputTokenDetails / outputTokenDetails 能拿到 noCache 与分项", () => {
  const mapped = mapUsageTokens({
    inputTokens: 200_000,
    outputTokens: 50_000,
    totalTokens: 250_000,
    inputTokenDetails: {
      noCacheTokens: 100_000,
      cacheReadTokens: 100_000,
      cacheWriteTokens: 0
    },
    outputTokenDetails: {
      textTokens: 30_000,
      reasoningTokens: 20_000
    }
  })
  assert.equal(mapped?.inputTokens, 200_000)
  assert.equal(mapped?.noCacheTokens, 100_000)
  assert.equal(mapped?.cacheReadTokens, 100_000)
  assert.equal(mapped?.cacheWriteTokens, 0)
  assert.equal(mapped?.reasoningTokens, 20_000)
  assert.equal(mapped?.outputTokens, 50_000)
})
