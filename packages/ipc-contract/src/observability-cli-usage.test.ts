/**
 * cliUsage 契约：四态、12 源、拒绝旧 found 字段。
 */
import assert from "node:assert/strict"
import test from "node:test"
import {
  CLI_USAGE_SOURCE_IDS,
  CliTranscriptUsage,
  CliUsageSource,
  GROK_USD_TICKS_PER_DOLLAR,
  TelemetryMetric
} from "./observability.ts"

test("ticks 常量是 1e10", () => {
  assert.equal(GROK_USD_TICKS_PER_DOLLAR, 10_000_000_000)
})

test("拒绝旧 found 字段", () => {
  assert.throws(() =>
    CliUsageSource.parse({
      id: "claude",
      found: true,
      sessionCount: 0
    })
  )
})

test("12 源 roundtrip，顺序固定", () => {
  const sources = CLI_USAGE_SOURCE_IDS.map((id) => ({
    id,
    status: "unsupported" as const,
    sessionCount: 0,
    fileCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheTokens: 0,
    totalTokens: 0
  }))
  const parsed = CliTranscriptUsage.parse({
    scannedAt: 1,
    sources,
    days: [],
    models: [],
    projects: []
  })
  assert.deepEqual(
    parsed.sources.map((item) => item.id),
    [...CLI_USAGE_SOURCE_IDS]
  )
})

test("costUsdTicks 不允许 0", () => {
  assert.throws(() =>
    CliUsageSource.parse({
      id: "grok",
      status: "has-usage",
      sessionCount: 1,
      fileCount: 1,
      inputTokens: 1,
      outputTokens: 0,
      cacheTokens: 0,
      totalTokens: 1,
      costUsdTicks: 0
    })
  )
})

test("指标 costStatus / costMissing 非法枚举不丢整行", () => {
  const parsed = TelemetryMetric.safeParse({
    id: "met_1",
    runId: "run_1",
    kind: "agent",
    status: "completed",
    createdAt: 1,
    estimatedCostUsd: 0.2,
    costStatus: "legacy-status",
    costMissing: ["warp", "tier"]
  })
  assert.equal(parsed.success, true)
  assert.equal(parsed.data?.estimatedCostUsd, 0.2)
  assert.equal(parsed.data?.costStatus, undefined)
  assert.equal(parsed.data?.costMissing, undefined)
})
