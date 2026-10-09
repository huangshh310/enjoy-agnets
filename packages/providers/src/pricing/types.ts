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
}

export type MatchedRate = {
  rate: ModelRate
  source: "snapshot" | "user" | "mixed"
  snapshotDate?: string
  snapshotVersion?: string
}
