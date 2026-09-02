/**
 * 上下文检查器视图模型。只保留真实用量与单轮遥测字段。
 */
export type TokenSpectrumBucketId = "messages" | "system" | "mcp" | "skills" | "memory"

export type TokenSpectrumBucket = {
  id: TokenSpectrumBucketId
  tokens: number
  barClass: string
}

export type ContextWindowStats = {
  usedTokens: number
  maxTokens: number
  usagePercent: number
  buckets: TokenSpectrumBucket[]
}

export type TurnPerformanceStats = {
  durationMs: number
  ttfoMs: number
  tokensPerSecond: number
  outputTokens: number
  isLive: boolean
}

/** 估算挂载芯片用量时只需片段与启用态。 */
export type ContextChipEstimate = {
  snippet?: string
  enabled?: boolean
}
