/**
 * 供应商 + 模型 id 精确命中。用户单价逐项覆盖快照，不做前缀 / 模糊匹配。
 */
import { lookupSnapshotRate, PRICE_SNAPSHOT } from "./snapshot.ts"
import type { MatchedRate, ModelRate, PriceSnapshot, UserModelRates } from "./types.ts"
import { userRatesToModelRate } from "./user-rates.ts"

const RATE_KEYS = ["input", "output", "cacheRead", "cacheWrite", "reasoning"] as const

export function matchModelRate(input: {
  providerKind: string
  modelId: string
  userRates?: UserModelRates
  snapshot?: PriceSnapshot
}): MatchedRate | undefined {
  const provider = input.providerKind.trim()
  const modelId = input.modelId.trim()
  const snap = provider && modelId ? lookupSnapshotRate(provider, modelId, input.snapshot) : undefined
  const user = userRatesToModelRate(input.userRates)
  const rate = overlayRate(snap, user)
  if (!hasAnyRate(rate)) return undefined
  const source = resolveSource(snap, user)
  return {
    rate,
    source,
    snapshotDate: snap ? (input.snapshot ?? PRICE_SNAPSHOT).date : undefined,
    snapshotVersion: snap ? (input.snapshot ?? PRICE_SNAPSHOT).version : undefined,
    tierContext: snap?.tierContext
  }
}

function overlayRate(snap: ModelRate | undefined, user: ModelRate): ModelRate {
  const next: ModelRate = {}
  for (const key of RATE_KEYS) {
    const value = user[key] ?? snap?.[key]
    if (value !== undefined) next[key] = value
  }
  return next
}

function hasAnyRate(rate: ModelRate): boolean {
  return RATE_KEYS.some((key) => rate[key] !== undefined)
}

function resolveSource(snap: ModelRate | undefined, user: ModelRate): MatchedRate["source"] {
  const userAny = hasAnyRate(user)
  const snapAny = Boolean(snap && hasAnyRate(snap))
  if (userAny && snapAny) return RATE_KEYS.some((key) => user[key] === undefined && snap?.[key] !== undefined)
    ? "mixed"
    : "user"
  return userAny ? "user" : "snapshot"
}

