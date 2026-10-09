import assert from "node:assert/strict"
import { test } from "node:test"
import { enrichUsageEvent } from "./enrich-usage-cost.ts"

test("usage.updated 挂上估算；缺单价是未知不是 0", () => {
  const priced = enrichUsageEvent(
    { type: "usage.updated", runId: "r1", inputTokens: 1_000_000, outputTokens: 0 },
    { runtimeId: "enjoy-local", providerKind: "anthropic", modelId: "claude-sonnet-4-5" }
  )
  assert.equal(priced.estimatedCost?.status, "estimated")
  assert.equal(typeof priced.estimatedCost?.usd, "number")
  assert.notEqual(priced.estimatedCost?.usd, 0)

  const unknown = enrichUsageEvent(
    { type: "usage.updated", runId: "r2", inputTokens: 10, outputTokens: 10, cacheReadTokens: 4 },
    {
      runtimeId: "enjoy-local",
      providerKind: "custom",
      modelId: "mystery",
      userRates: { inputPricePerMillion: 1, outputPricePerMillion: 2 }
    }
  )
  assert.equal(unknown.estimatedCost?.status, "unknown")
  assert.equal(unknown.estimatedCost?.usd, undefined)
})
