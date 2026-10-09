import assert from "node:assert/strict"
import { test } from "node:test"
import { mapUsageTokens } from "@enjoy-agents/agent-core"
import { estimateRunCost } from "@enjoy-agents/providers/pricing"
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

test("SDK 原始 usage 映射后再估算，缓存与推理不重复计价", () => {
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
  assert.ok(mapped)
  assert.equal(mapped.noCacheTokens, 100_000)
  const cost = estimateRunCost({
    usage: mapped,
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5"
  })
  assert.equal(cost.status, "estimated")
  assert.equal(cost.usd, 1.08)
})
