/**
 * 模型路由大盘类型契约定义。
 */
export interface ModelRoutingRowData {
  id: string
  label: string
  provider: string
  providerName: string
  upstreamName: string
  capabilities: string[]
  isReasoning: boolean
  status: "healthy" | "degraded" | "unconfigured"
  callCount: number
  successRate: number
  avgDurationMs: number
  p95DurationMs: number
  totalTokens: number
  lastActiveTime?: number
}

export type RoutingCapabilityFilter =
  | "all"
  | "text"
  | "tools"
  | "vision"
  | "image"
  | "video"
  | "realtime"

export type RoutingStatusFilter = "all" | "healthy" | "degraded" | "unconfigured"
