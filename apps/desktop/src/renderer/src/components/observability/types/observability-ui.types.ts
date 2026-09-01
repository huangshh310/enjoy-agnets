/**
 * Observability UI 视图与统计类型定义
 */

export type MetricStatusFilter = "all" | "success" | "failed" | "running" | "timeout"
export type MetricKindFilter = "all" | "agent" | "stream" | "image" | "video" | "embed"

/** 聚合性能统计数据 */
export interface ObservabilityAggregatedStats {
  totalRuns: number
  successCount: number
  failedCount: number
  successRatePercent: number
  avgDurationMs: number
  p95DurationMs: number
  avgTtfoMs: number
  totalTokens: number
  avgTokensPerSec: number
}
