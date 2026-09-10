/**
 * Grok usage.json：只读 session 合计，不累加 turns[]。
 */
import {
  asRecord,
  dayKeyFromTimestamp,
  hasAnyTokens,
  intField,
  optionalIntField,
  stringField,
  type UsageDelta
} from "./parse-usage.ts"

export function parseGrokUsageFile(text: string): UsageDelta | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  const root = asRecord(parsed)
  const session = asRecord(root?.session) ?? root
  if (!session) return null
  const inputTokens = intField(session, "inputTokens")
  const outputTokens = intField(session, "outputTokens")
  const cacheTokens = intField(session, "cachedReadTokens") + intField(session, "cacheCreationTokens")
  const totalField = optionalIntField(session, "totalTokens")
  const totalTokens = totalField === undefined ? inputTokens + outputTokens + cacheTokens : totalField
  const ticks = optionalIntField(session, "costUsdTicks")
  const delta: UsageDelta = {
    inputTokens,
    outputTokens,
    cacheTokens,
    totalTokens,
    model: stringField(session, "primaryModelId"),
    day:
      dayKeyFromTimestamp(root?.updatedAt) ??
      dayKeyFromTimestamp(session.updatedAt) ??
      dayKeyFromTimestamp(stringField(root, "updatedAt")),
    sourceId: "grok",
    costUsdTicks: ticks && ticks > 0 ? ticks : undefined
  }
  if (!hasAnyTokens(delta)) return null
  return delta
}
