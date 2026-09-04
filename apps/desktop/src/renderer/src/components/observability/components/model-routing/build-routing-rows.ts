/**
 * 把已配置模型与 TelemetryMetrics 聚合成路由行。
 * P95 只用 >0 的 durationMs；上游列是协议风格 + 模型 id，不下发 vault URL。
 */
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import type { ModelRoutingRowData, RoutingModelOption } from "./model-routing.types"

function percentileNearestRank(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil(sortedAsc.length * p) - 1))
  return sortedAsc[idx] ?? 0
}

const SUCCESS_STATUSES = new Set(["success", "completed", "ok"])

function isSuccess(status: string): boolean {
  return SUCCESS_STATUSES.has(status)
}

function formatUpstream(apiStyle: string | undefined, id: string): string {
  return apiStyle ? `${apiStyle} · ${id}` : id
}

function groupMetrics(metrics: TelemetryMetric[]): Map<string, TelemetryMetric[]> {
  const byModel = new Map<string, TelemetryMetric[]>()
  for (const metric of metrics) {
    const mid = metric.modelId
    if (!mid) continue
    const list = byModel.get(mid) ?? []
    list.push(metric)
    byModel.set(mid, list)
  }
  return byModel
}

function collectModelIds(
  models: RoutingModelOption[],
  metricsByModel: Map<string, TelemetryMetric[]>
): string[] {
  const ids = new Set<string>()
  for (const model of models) ids.add(model.id)
  for (const id of metricsByModel.keys()) ids.add(id)
  return [...ids]
}

function summarizeMetrics(list: TelemetryMetric[]) {
  let successCount = 0
  let totalDuration = 0
  let durationSamples = 0
  let totalTokens = 0
  const positiveDurations: number[] = []

  for (const metric of list) {
    if (isSuccess(metric.status)) successCount++
    const duration = metric.durationMs
    if (typeof duration === "number" && duration > 0) {
      totalDuration += duration
      durationSamples += 1
      positiveDurations.push(duration)
    }
    totalTokens += (metric.inputTokens ?? 0) + (metric.outputTokens ?? 0)
  }

  positiveDurations.sort((a, b) => a - b)
  const callCount = list.length
  return {
    callCount,
    successRate: callCount > 0 ? Math.round((successCount / callCount) * 100) : 0,
    avgDurationMs: durationSamples > 0 ? Math.round(totalDuration / durationSamples) : 0,
    p95DurationMs: percentileNearestRank(positiveDurations, 0.95),
    totalTokens,
    lastActiveTime: list[0]?.createdAt
  }
}

function resolveStatus(
  option: RoutingModelOption | undefined,
  callCount: number,
  successRate: number
): ModelRoutingRowData["status"] {
  if (!option) return "unconfigured"
  if (callCount > 0 && successRate < 80) return "degraded"
  return "healthy"
}

export function buildRoutingRows(
  models: RoutingModelOption[],
  metrics: TelemetryMetric[]
): ModelRoutingRowData[] {
  const metricsByModel = groupMetrics(metrics)
  const rows: ModelRoutingRowData[] = []

  for (const id of collectModelIds(models, metricsByModel)) {
    const option = models.find((model) => model.id === id)
    const list = metricsByModel.get(id) ?? []
    const stats = summarizeMetrics(list)
    rows.push({
      id,
      label: option?.label ?? id,
      provider: option?.provider ?? "custom",
      providerId: option?.providerId,
      providerName: option?.providerName ?? option?.provider ?? id,
      upstreamName: formatUpstream(option?.apiStyle, id),
      capabilities: option?.capabilities ?? [],
      isReasoning: Boolean(option?.isReasoning),
      status: resolveStatus(option, stats.callCount, stats.successRate),
      callCount: stats.callCount,
      successRate: stats.successRate,
      avgDurationMs: stats.avgDurationMs,
      p95DurationMs: stats.p95DurationMs,
      totalTokens: stats.totalTokens,
      lastActiveTime: stats.lastActiveTime ?? option?.probedAt
    })
  }

  return rows.sort((a, b) => b.callCount - a.callCount)
}
