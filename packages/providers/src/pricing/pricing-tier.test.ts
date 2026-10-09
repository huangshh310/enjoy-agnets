import assert from "node:assert/strict"
import { test } from "node:test"
import { estimateRunCost } from "./estimate.ts"
import type { PriceSnapshot } from "./types.ts"

const TABLE: PriceSnapshot = {
  version: "test",
  date: "2026-01-02",
  source: "models.dev",
  models: [
    {
      provider: "anthropic",
      modelId: "tiered-sonnet",
      input: 3,
      output: 15,
      tierContext: 32_000
    }
  ]
}

test("有分档的模型，单步 input 超过最低档阈值不得标为 estimated", () => {
  const over = estimateRunCost({
    usage: { inputTokens: 32_001, outputTokens: 0, maxStepInputTokens: 32_001 },
    providerKind: "anthropic",
    modelId: "tiered-sonnet",
    snapshot: TABLE
  })
  assert.equal(over.status, "unknown")
  assert.deepEqual(over.missing, ["tier"])
  assert.equal(over.usd, undefined)

  const under = estimateRunCost({
    usage: { inputTokens: 32_000, outputTokens: 0, maxStepInputTokens: 32_000 },
    providerKind: "anthropic",
    modelId: "tiered-sonnet",
    snapshot: TABLE
  })
  assert.equal(under.status, "estimated")
  assert.equal(under.usd, 0.096)
})

test("多步合计超档但每步没超档仍是 estimated；某一步超档才 unknown", () => {
  const summed = estimateRunCost({
    usage: { inputTokens: 1_000_000, outputTokens: 0, maxStepInputTokens: 30_000 },
    providerKind: "anthropic",
    modelId: "tiered-sonnet",
    snapshot: TABLE
  })
  assert.equal(summed.status, "estimated")
  assert.equal(summed.usd, 3)

  const oneOver = estimateRunCost({
    usage: { inputTokens: 1_000_000, outputTokens: 0, maxStepInputTokens: 33_000 },
    providerKind: "anthropic",
    modelId: "tiered-sonnet",
    snapshot: TABLE
  })
  assert.equal(oneOver.status, "unknown")
  assert.deepEqual(oneOver.missing, ["tier"])

  const noStep = estimateRunCost({
    usage: { inputTokens: 1_000, outputTokens: 0 },
    providerKind: "anthropic",
    modelId: "tiered-sonnet",
    snapshot: TABLE
  })
  assert.equal(noStep.status, "unknown")
  assert.deepEqual(noStep.missing, ["tier"])
})
