/**
 * 链路明细客户端过滤：状态、kind、精确模型、模糊搜索。
 */
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import type { MetricKindFilter, MetricStatusFilter } from "../types/observability-ui.types"

const SUCCESS_STATUSES = new Set(["success", "completed", "ok"])

export function filterObservabilityMetrics(
  metrics: TelemetryMetric[],
  options: {
    statusFilter: MetricStatusFilter
    kindFilter: MetricKindFilter
    search: string
    exactModelId: string | null
  }
): TelemetryMetric[] {
  return metrics.filter(
    (metric) =>
      matchStatus(metric, options.statusFilter) &&
      matchKind(metric, options.kindFilter) &&
      matchSearch(metric, options.search, options.exactModelId)
  )
}

function matchStatus(metric: TelemetryMetric, filter: MetricStatusFilter): boolean {
  if (filter === "all") return true
  if (filter === "success") return SUCCESS_STATUSES.has(metric.status)
  if (filter === "failed") {
    return !SUCCESS_STATUSES.has(metric.status) && metric.status !== "running"
  }
  if (filter === "timeout") return metric.errorClass === "timeout"
  return metric.status === "running"
}

function matchKind(metric: TelemetryMetric, filter: MetricKindFilter): boolean {
  if (filter === "all") return true
  return metric.kind.toLowerCase().includes(filter.toLowerCase())
}

function matchSearch(metric: TelemetryMetric, search: string, exactModelId: string | null): boolean {
  if (exactModelId) return metric.modelId === exactModelId
  const query = search.trim().toLowerCase()
  if (!query) return true
  return Boolean(
    metric.modelId?.toLowerCase().includes(query) ||
      metric.runId.toLowerCase().includes(query) ||
      metric.id.toLowerCase().includes(query) ||
      metric.kind.toLowerCase().includes(query)
  )
}
