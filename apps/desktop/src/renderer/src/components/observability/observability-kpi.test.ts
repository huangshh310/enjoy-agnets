/**
 * 可观测性 KPI 聚合统计与数据过滤单测
 */
import test from "node:test"
import assert from "node:assert/strict"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"

function computeKpi(metrics: TelemetryMetric[]) {
  if (metrics.length === 0) {
    return { total: 0, successRate: 100, avgDuration: 0, p95Duration: 0 }
  }
  const total = metrics.length
  const success = metrics.filter(
    (m) => m.status === "success" || m.status === "completed" || m.status === "ok"
  ).length
  const successRate = (success / total) * 100
  const durations = metrics.map((m) => m.durationMs ?? 0).sort((a, b) => a - b)
  const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / total)
  const p95Index = Math.floor(durations.length * 0.95)
  const p95Duration = durations[p95Index] ?? durations[durations.length - 1] ?? 0
  return { total, successRate, avgDuration, p95Duration }
}

test("computeKpi 正确计算调用总量、成功率与 P95 延迟", () => {
  const sampleMetrics: TelemetryMetric[] = [
    {
      id: "met_1",
      runId: "run_1",
      kind: "video",
      modelId: "grok-imagine-video",
      status: "failed",
      durationMs: 9565,
      errorClass: "provider",
      createdAt: Date.now()
    },
    {
      id: "met_2",
      runId: "run_2",
      kind: "video",
      modelId: "grok-imagine-video",
      status: "failed",
      durationMs: 38060,
      errorClass: "timeout",
      createdAt: Date.now()
    },
    {
      id: "met_3",
      runId: "run_3",
      kind: "stream",
      modelId: "claude-3-5-sonnet",
      status: "success",
      durationMs: 1200,
      ttfoMs: 250,
      inputTokens: 100,
      outputTokens: 300,
      tokensPerSecond: 65.4,
      createdAt: Date.now()
    },
    {
      id: "met_4",
      runId: "run_4",
      kind: "agent",
      modelId: "gpt-4o",
      status: "completed",
      durationMs: 2400,
      ttfoMs: 300,
      inputTokens: 500,
      outputTokens: 400,
      tokensPerSecond: 45.0,
      createdAt: Date.now()
    }
  ]

  const kpi = computeKpi(sampleMetrics)
  assert.equal(kpi.total, 4)
  assert.equal(kpi.successRate, 50) // 2 成功，2 失败 -> 50%
  assert.ok(kpi.avgDuration > 0)
  assert.ok(kpi.p95Duration >= 38060)
})
