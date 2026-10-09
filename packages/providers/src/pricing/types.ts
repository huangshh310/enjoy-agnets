/**
 * 每百万 token 的 USD 单价。缺项是未知，不是 0。
 */
export type ModelRate = {
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  reasoning?: number
}

export type SnapshotModelRate = ModelRate & {
  provider: string
  modelId: string
  aliases?: string[]
  /** models.dev cost.tiers 里最低一档的上下文阈值；超过则整次 unknown。 */
  tierContext?: number
}

export type PriceSnapshot = {
  version: string
  date: string
  source: string
  sourceUrl?: string
  sourceEtag?: string
  sourceSha256?: string
  models: SnapshotModelRate[]
}

export type UserModelRates = {
  inputPricePerMillion?: number
  outputPricePerMillion?: number
  cacheReadPricePerMillion?: number
  cacheWritePricePerMillion?: number
  reasoningPricePerMillion?: number
}

export type TokenUsage = {
  inputTokens?: number
  outputTokens?: number
  noCacheTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  /** 多泵里有一轮没上报用量：整次未知。 */
  usageIncomplete?: boolean
  /** 各泵 input 的最大值，用来判断是否跨过 models.dev 分档阈值。 */
  maxPumpInputTokens?: number
}

export type MatchedRate = {
  rate: ModelRate
  source: "snapshot" | "user" | "mixed"
  snapshotDate?: string
  snapshotVersion?: string
  tierContext?: number
}
