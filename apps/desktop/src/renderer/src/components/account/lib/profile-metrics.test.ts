/**
 * 个人中心遥测聚合：空数据不造假、热力分级与环比计算。
 */
import test from "node:test"
import assert from "node:assert/strict"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import {
  buildDailyCounts,
  buildHeatmap,
  buildSummary,
  computeTopStreak,
  formatContributionUsd,
  formatDurationMs,
  formatSpendUsd,
  formatTokenAmount,
  growthLabel,
  heatmapLevel,
  tokenGrowthLabel,
  yearSpendUsdFromMetrics
} from "./profile-metrics.ts"

function metric(partial: Partial<TelemetryMetric> & Pick<TelemetryMetric, "id" | "createdAt">): TelemetryMetric {
  return {
    runId: partial.runId ?? partial.id,
    kind: partial.kind ?? "chat",
    status: partial.status ?? "ok",
    inputTokens: partial.inputTokens,
    outputTokens: partial.outputTokens,
    durationMs: partial.durationMs,
    estimatedCostUsd: partial.estimatedCostUsd,
    createdAt: partial.createdAt,
    id: partial.id
  }
}

test("heatmapLevel: 能正确将活跃数映射到 0~4 五阶色阶", () => {
  assert.equal(heatmapLevel(0), 0)
  assert.equal(heatmapLevel(1), 1)
  assert.equal(heatmapLevel(3), 1)
  assert.equal(heatmapLevel(4), 2)
  assert.equal(heatmapLevel(6), 2)
  assert.equal(heatmapLevel(8), 3)
  assert.equal(heatmapLevel(10), 3)
  assert.equal(heatmapLevel(15), 4)
})

test("formatTokenAmount: 空值是 0 而不是占位 9B", () => {
  assert.equal(formatTokenAmount(0), "0")
  assert.equal(formatTokenAmount(9_000_000_000), "9.0B")
  assert.equal(formatTokenAmount(562_700_000), "562.7M")
  assert.equal(formatTokenAmount(18_400), "18k")
  assert.equal(formatTokenAmount(500), "500")
})

test("formatDurationMs: 无耗时显示破折号", () => {
  assert.equal(formatDurationMs(0), "—")
  assert.equal(formatDurationMs(46_440_000), "12h 54m")
})

test("buildSummary: 空 metrics 全部为零或破折号，无上年基数不写环比", () => {
  const summary = buildSummary([], new Date("2026-09-04T12:00:00"))
  assert.equal(summary.contributionsCount, 0)
  assert.equal(summary.contributionsGrowth, "")
  assert.equal(summary.yearSpendUsd, null)
  assert.equal(summary.lifetimeTokens, "0")
  assert.equal(summary.peakTokens, "0")
  assert.equal(summary.longestTaskDuration, "—")
  assert.equal(summary.topStreakDays, "0d")
})

test("buildSummary: 没有真实费用来源就不出花费行", () => {
  const now = new Date("2026-09-04T12:00:00")
  const metrics = [
    metric({
      id: "a",
      createdAt: new Date("2026-03-01T00:00:00").getTime(),
      inputTokens: 1000
    }),
    metric({
      id: "last-year-cost",
      createdAt: new Date("2025-03-01T00:00:00").getTime(),
      estimatedCostUsd: 9.99
    }),
    metric({
      id: "nan",
      createdAt: new Date("2026-04-01T00:00:00").getTime(),
      estimatedCostUsd: Number.NaN
    })
  ]
  assert.equal(yearSpendUsdFromMetrics(metrics, now), null)
  const summary = buildSummary(metrics, now)
  assert.equal(summary.yearSpendUsd, null)
  assert.equal(summary.contributionsGrowth, "")
})

test("buildSummary: 本年 estimatedCostUsd 求和才出花费", () => {
  const now = new Date("2026-09-04T12:00:00")
  const summary = buildSummary(
    [
      metric({
        id: "a",
        createdAt: new Date("2026-03-01T00:00:00").getTime(),
        estimatedCostUsd: 1.5
      }),
      metric({
        id: "b",
        createdAt: new Date("2026-04-01T00:00:00").getTime(),
        estimatedCostUsd: 2.25
      }),
      metric({
        id: "d",
        createdAt: new Date("2026-05-01T00:00:00").getTime()
      })
    ],
    now
  )
  assert.equal(summary.yearSpendUsd, 3.75)
  assert.equal(summary.contributionsGrowth, "")
  assert.equal(formatSpendUsd(summary.yearSpendUsd ?? 0), "$3.75")
})

test("buildSummary: 两年都有真实费用才画环比", () => {
  const now = new Date("2026-09-04T12:00:00")
  const summary = buildSummary(
    [
      metric({
        id: "this",
        createdAt: new Date("2026-03-01T00:00:00").getTime(),
        estimatedCostUsd: 10
      }),
      metric({
        id: "last",
        createdAt: new Date("2025-03-01T00:00:00").getTime(),
        estimatedCostUsd: 8
      })
    ],
    now
  )
  assert.equal(summary.yearSpendUsd, 10)
  assert.equal(summary.contributionsGrowth, "+25.0%")
})

test("buildSummary: 只统计真实 token / 次数 / 最长任务", () => {
  const now = new Date("2026-09-04T12:00:00")
  const summary = buildSummary(
    [
      metric({
        id: "a",
        createdAt: new Date("2026-03-01T00:00:00").getTime(),
        inputTokens: 1000,
        outputTokens: 500,
        durationMs: 12_000
      }),
      metric({
        id: "b",
        createdAt: new Date("2026-03-02T00:00:00").getTime(),
        inputTokens: 2000,
        outputTokens: 0,
        durationMs: 90_000
      })
    ],
    now
  )
  assert.equal(summary.contributionsCount, 2)
  assert.equal(summary.contributionsGrowth, "")
  assert.equal(summary.lifetimeTokens, "4k")
  assert.equal(summary.peakTokens, "2k")
  assert.equal(summary.longestTaskDuration, "1m 30s")
})

test("buildHeatmap: 空日保持 0，不填充伪随机活跃", () => {
  const now = new Date("2026-09-04T12:00:00")
  const cells = buildHeatmap([], "weekly", now)
  assert.equal(cells.length, 56)
  assert.ok(cells.every((cell) => cell.count === 0 && cell.level === 0))
})

test("computeTopStreak: 连续活跃天数在 0 处断开", () => {
  const streak = computeTopStreak([
    { date: "a", count: 1, level: 1 },
    { date: "b", count: 2, level: 1 },
    { date: "c", count: 0, level: 0 },
    { date: "d", count: 4, level: 2 }
  ])
  assert.equal(streak, 2)
})

test("formatContributionUsd / growthLabel / tokenGrowthLabel: 对齐 BoardUI 价格与环比胶囊", () => {
  assert.equal(formatContributionUsd(7462), "$7,462")
  assert.equal(formatContributionUsd(51), "$51")
  assert.equal(growthLabel(0, 0), "")
  assert.equal(growthLabel(51, 0), "")
  assert.equal(growthLabel(10, 8), "+25.0%")
  assert.equal(growthLabel(8, 10), "-20.0%")

  const month = new Date(2026, 8, 1)
  const points = buildDailyCounts(
    [
      metric({
        id: "a",
        createdAt: new Date(2026, 8, 4, 10).getTime(),
        inputTokens: 100
      })
    ],
    month,
    new Date(2026, 8, 4, 12)
  )
  const day4 = points.find((point) => point.id.endsWith("-04"))
  assert.equal(day4?.count, 1)
  assert.equal(day4?.isToday, true)
  assert.equal(tokenGrowthLabel([], month), "")
  assert.equal(
    tokenGrowthLabel(
      [metric({ id: "a", createdAt: new Date(2026, 8, 4, 10).getTime(), inputTokens: 100 })],
      month
    ),
    ""
  )
})
