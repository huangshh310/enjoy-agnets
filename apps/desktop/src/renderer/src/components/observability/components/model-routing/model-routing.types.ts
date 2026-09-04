/**
 * 模型路由大盘类型契约。
 */

export interface ModelRoutingRowData {
  id: string
  label: string
  provider: string
  providerId?: string
  providerName: string
  /** 协议风格 + 模型 id，不是 vault 里的 baseURL */
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

export type RoutingModelOption = {
  id: string
  label: string
  provider: string
  providerId?: string
  providerName?: string
  apiStyle?: string
  capabilities?: string[]
  isReasoning?: boolean
  probedAt?: number
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
