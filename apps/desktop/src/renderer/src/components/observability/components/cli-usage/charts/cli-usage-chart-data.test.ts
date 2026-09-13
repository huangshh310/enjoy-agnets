/**
 * 本机记录图表数据整形单元测试。
 */
import assert from "node:assert/strict"
import test from "node:test"
import type { CliTranscriptUsage } from "@enjoy-agents/ipc-contract"
import { buildCliUsageChartModel } from "./cli-usage-chart-data.ts"

const mockTranslate = (key: string, vars?: Record<string, string | number>) => {
  if (vars?.n != null) return `${key}:${vars.n}`
  return key
}

test("buildCliUsageChartModel generates slices, trend, composed and ranking", () => {
  const sampleUsage: CliTranscriptUsage = {
    scannedAt: 1726000000,
    sources: [
      {
        id: "grok",
        status: "has-usage",
        sessionCount: 10,
        fileCount: 10,
        inputTokens: 1000,
        outputTokens: 500,
        cacheTokens: 200,
        totalTokens: 1500
      },
      {
        id: "claude",
        status: "has-usage",
        sessionCount: 2,
        fileCount: 2,
        inputTokens: 500,
        outputTokens: 200,
        cacheTokens: 100,
        totalTokens: 700
      },
      {
        id: "cursor",
        status: "scanned-empty",
        sessionCount: 0,
        fileCount: 5,
        inputTokens: 0,
        outputTokens: 0,
        cacheTokens: 0,
        totalTokens: 0
      }
    ],
    days: [
      {
        key: "2026-09-12",
        inputTokens: 500,
        outputTokens: 200,
        cacheTokens: 100,
        totalTokens: 700,
        sessions: 2,
        breakdownSessions: 2,
        sourceIds: ["claude"]
      },
      {
        key: "2026-09-10",
        inputTokens: 1000,
        outputTokens: 500,
        cacheTokens: 200,
        totalTokens: 1500,
        sessions: 10,
        breakdownSessions: 10,
        sourceIds: ["grok"]
      }
    ],
    models: [
      {
        key: "claude-3-5-sonnet",
        inputTokens: 500,
        outputTokens: 200,
        cacheTokens: 100,
        totalTokens: 700,
        sessions: 2,
        breakdownSessions: 2,
        sourceIds: ["claude"]
      },
      {
        key: "grok-beta",
        inputTokens: 1000,
        outputTokens: 500,
        cacheTokens: 200,
        totalTokens: 1500,
        sessions: 10,
        breakdownSessions: 10,
        sourceIds: ["grok"]
      }
    ],
    projects: []
  }

  const model = buildCliUsageChartModel(sampleUsage, null, mockTranslate as any)

  // 1. CLI 切片降序
  assert.equal(model.cliSlices.length, 2)
  assert.equal(model.cliSlices[0].id, "grok")
  assert.equal(model.cliSlices[0].amount, 1500)
  assert.equal(model.cliSlices[1].id, "claude")
  assert.equal(model.cliSlices[1].amount, 700)

  // 2. 模型切片与排行
  assert.equal(model.modelSlices.length, 2)
  assert.equal(model.modelSlices[0].id, "grok-beta")
  assert.equal(model.modelRanking[0].id, "grok-beta")

  // 3. 日期趋势升序
  assert.equal(model.daysTrend.length, 2)
  assert.equal(model.daysTrend[0].rawDay, "2026-09-10")
  assert.equal(model.daysTrend[1].rawDay, "2026-09-12")

  // 4. 组合与累计增长
  assert.equal(model.composed.length, 2)
  assert.equal(model.composed[0].tokens, 1500)
  assert.equal(model.composed[0].cumulative, 1500)
  assert.equal(model.composed[1].tokens, 700)
  assert.equal(model.composed[1].cumulative, 2200)

  assert.equal(model.growth[1].total, 2200)
  assert.equal(model.totalTokens, 2200)
})

test("buildCliUsageChartModel filters by selected source", () => {
  const sampleUsage: CliTranscriptUsage = {
    scannedAt: 1726000000,
    sources: [
      {
        id: "grok",
        status: "has-usage",
        sessionCount: 5,
        fileCount: 5,
        inputTokens: 100,
        outputTokens: 50,
        cacheTokens: 0,
        totalTokens: 150
      },
      {
        id: "claude",
        status: "has-usage",
        sessionCount: 1,
        fileCount: 1,
        inputTokens: 10,
        outputTokens: 5,
        cacheTokens: 0,
        totalTokens: 15
      }
    ],
    days: [
      {
        key: "2026-09-10",
        inputTokens: 100,
        outputTokens: 50,
        cacheTokens: 0,
        totalTokens: 150,
        sessions: 5,
        breakdownSessions: 5,
        sourceIds: ["grok"]
      },
      {
        key: "2026-09-11",
        inputTokens: 10,
        outputTokens: 5,
        cacheTokens: 0,
        totalTokens: 15,
        sessions: 1,
        breakdownSessions: 1,
        sourceIds: ["claude"]
      }
    ],
    models: [],
    projects: []
  }

  const grokOnly = buildCliUsageChartModel(sampleUsage, "grok", mockTranslate as any)
  assert.equal(grokOnly.daysTrend.length, 1)
  assert.equal(grokOnly.daysTrend[0].rawDay, "2026-09-10")
})
