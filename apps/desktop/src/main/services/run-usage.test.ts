import assert from "node:assert/strict"
import { test } from "node:test"
import { estimateRunCost } from "@enjoy-agents/providers/pricing"
import { accumulateRunUsage, markPumpMissingUsage, type UsageAccumulator } from "./run-usage-accumulate.ts"

test("两次泵的用量正确相加", () => {
  const run: UsageAccumulator = {}
  accumulateRunUsage(run, {
    inputTokens: 100,
    noCacheTokens: 80,
    cacheReadTokens: 20,
    outputTokens: 10,
    reasoningTokens: 4
  })
  accumulateRunUsage(run, {
    inputTokens: 50,
    noCacheTokens: 50,
    cacheReadTokens: 0,
    outputTokens: 8,
    reasoningTokens: 2
  })
  assert.equal(run.inputTokens, 150)
  assert.equal(run.noCacheTokens, 130)
  assert.equal(run.cacheReadTokens, 20)
  assert.equal(run.outputTokens, 18)
  assert.equal(run.reasoningTokens, 6)
  const cost = estimateRunCost({
    usage: run,
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5"
  })
  assert.equal(cost.status, "estimated")
  assert.ok(typeof cost.usd === "number")
})

test("某字段只在部分泵出现时先归一再累加，两泵输入都计价", () => {
  const run: UsageAccumulator = {}
  accumulateRunUsage(run, { noCacheTokens: 80, inputTokens: 100, cacheReadTokens: 20 })
  accumulateRunUsage(run, { inputTokens: 50 })
  assert.equal(run.inputTokens, 150)
  assert.equal(run.noCacheTokens, 130)
  const missed = estimateRunCost({
    usage: { inputTokens: 150, noCacheTokens: 80, cacheReadTokens: 20 },
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5"
  })
  const cost = estimateRunCost({
    usage: run,
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5"
  })
  assert.equal(cost.status, "estimated")
  assert.notEqual(cost.usd, missed.usd)
  const expected = estimateRunCost({
    usage: { inputTokens: 150, noCacheTokens: 130, cacheReadTokens: 20 },
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5"
  })
  assert.equal(cost.usd, expected.usd)
})

test("其中一轮缺用量时为 unknown", () => {
  const run: UsageAccumulator = {}
  accumulateRunUsage(run, { inputTokens: 100, outputTokens: 10 })
  markPumpMissingUsage(run)
  const cost = estimateRunCost({
    usage: { ...run, usageIncomplete: run.usageIncomplete },
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5"
  })
  assert.equal(run.usageIncomplete, true)
  assert.equal(cost.status, "unknown")
  assert.deepEqual(cost.missing, ["usage"])
})
