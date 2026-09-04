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

/**
 * 根据当前视口高度智能自适应计算推荐的表格单页条数，
 * 彻底消除大屏大片空白与小屏挤压溢出。
 */
export function getAdaptivePageSize(): number {
  if (typeof window === "undefined") return 10
  const h = window.innerHeight
  if (h >= 1150) return 20
  if (h >= 920) return 15
  return 10
}
