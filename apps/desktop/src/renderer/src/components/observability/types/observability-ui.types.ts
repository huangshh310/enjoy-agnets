/**
 * Observability UI 视图与统计类型定义
 */

export type MetricStatusFilter = "all" | "success" | "failed" | "running" | "timeout"
export type MetricKindFilter = "all" | "agent" | "stream" | "image" | "video" | "embed"
export type ActiveObservabilityView = "dashboard" | "routing" | "traces" | "replay"

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
  if (h > 1150) return 20
  if (h >= 920) return 15
  return 10
}

/** 最近秩百分位。空数组返回 0。 */
export function percentileNearestRank(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil(sortedAsc.length * p) - 1))
  return sortedAsc[idx] ?? 0
}
