/**
 * 本机记录用量合计与拆分展示。Codex 常只有 total_tokens，拆分全 0 不当成真零。
 */
import type { CliUsageBucket, CliUsageSource } from "@enjoy-agents/ipc-contract"

const EMPTY_BUCKET: CliUsageBucket = {
  key: "total",
  inputTokens: 0,
  outputTokens: 0,
  cacheTokens: 0,
  totalTokens: 0,
  sessions: 0,
  breakdownSessions: 0,
  sourceIds: []
}

export function sumBuckets(rows: CliUsageBucket[]): CliUsageBucket {
  return rows.reduce(
    (acc, row) => ({
      key: "total",
      inputTokens: acc.inputTokens + row.inputTokens,
      outputTokens: acc.outputTokens + row.outputTokens,
      cacheTokens: acc.cacheTokens + row.cacheTokens,
      totalTokens: acc.totalTokens + row.totalTokens,
      sessions: acc.sessions + row.sessions,
      breakdownSessions: acc.breakdownSessions + row.breakdownSessions,
      sourceIds: [...new Set([...acc.sourceIds, ...row.sourceIds])]
    }),
    EMPTY_BUCKET
  )
}

/** 同时有「有拆分」和「仅合计」的可见源时，KPI 不走四卡。 */
export function hasMixedBreakdown(sources: CliUsageSource[]): boolean {
  const active = sources.filter((item) => item.status === "has-usage")
  const withSplit = active.some((item) => item.inputTokens + item.outputTokens + item.cacheTokens > 0)
  const onlyTotal = active.some(
    (item) => item.inputTokens + item.outputTokens + item.cacheTokens === 0 && item.totalTokens > 0
  )
  return withSplit && onlyTotal
}

/** 输入/输出/缓存任一大于 0 才认为有拆分。 */
export function hasTokenBreakdown(
  bucket: Pick<CliUsageBucket, "inputTokens" | "outputTokens" | "cacheTokens">
): boolean {
  return bucket.inputTokens + bucket.outputTokens + bucket.cacheTokens > 0
}

export function sharePercent(value: number, total: number): number | undefined {
  if (total <= 0 || value < 0) return undefined
  return Math.round((value / total) * 100)
}

/** 与 main `CUSTOM_UPSTREAM_MODEL_KEY` 同字面量。 */
export const CUSTOM_UPSTREAM_MODEL_KEY = "custom-upstream"

export function formatBucketLabel(key: string, translate: (path: string) => string): string {
  if (key === CUSTOM_UPSTREAM_MODEL_KEY) return translate("pages.observability.cliUsageCustomUpstream")
  return key
}

/** 与 ipc-contract GROK_USD_TICKS_PER_DOLLAR 同值：1 USD = 10^10 ticks。 */
export const GROK_USD_TICKS_PER_DOLLAR = 10_000_000_000

export function grokTicksToUsd(ticks: number): number {
  if (!Number.isFinite(ticks) || ticks <= 0) return 0
  return ticks / GROK_USD_TICKS_PER_DOLLAR
}

/** < $0.01 → 4 位（$0.0038）；否则 2 位（$1.00）。 */
export function formatGrokUsd(ticks: number): string {
  const usd = grokTicksToUsd(ticks)
  if (usd <= 0) return ""
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
}

export function grokRecordedTicks(sources: CliUsageSource[]): number | undefined {
  const grok = sources.find((item) => item.id === "grok")
  const ticks = grok?.costUsdTicks
  return ticks && ticks > 0 ? ticks : undefined
}
