/**
 * 本机记录 client-side 过滤。KPI 跟源级字段；表行只按 sourceIds 筛选。
 * 混源行数字仍是合计，调用方必须标出来，禁止当成该 CLI 单独用量。
 */
import type {
  CliUsageBucket,
  CliUsageSource,
  CliUsageSourceId,
  CliUsageSourceStatus
} from "@enjoy-agents/ipc-contract"
import { grokRecordedTicks, hasTokenBreakdown, sharePercent, sumBuckets } from "./format.ts"

const EMPTY_TOTAL: CliUsageBucket = {
  key: "total",
  inputTokens: 0,
  outputTokens: 0,
  cacheTokens: 0,
  totalTokens: 0,
  sessions: 0,
  breakdownSessions: 0,
  sourceIds: []
}

/** 有用量的源；选中时只留那一个。 */
export function visibleHasUsage(
  sources: CliUsageSource[],
  selected: CliUsageSourceId | null
): CliUsageSource[] {
  const active = sources.filter((item) => item.status === "has-usage")
  if (!selected) return active
  return active.filter((item) => item.id === selected)
}

/** 点同一源再点一次回到全部。 */
export function toggleSourceFilter(
  current: CliUsageSourceId | null,
  next: CliUsageSourceId
): CliUsageSourceId | null {
  return current === next ? null : next
}

export function isMixedBucket(row: CliUsageBucket): boolean {
  return row.sourceIds.length > 1
}

/** 未选中时不过滤；选中后保留包含该源的行（含混源）。 */
export function filterBuckets(
  rows: CliUsageBucket[],
  selected: CliUsageSourceId | null
): CliUsageBucket[] {
  if (!selected) return rows
  return rows.filter((row) => row.sourceIds.includes(selected))
}

/** 把源级合计收成桶，供脉冲行复用拆分判定。 */
export function sourceToBucket(source: CliUsageSource): CliUsageBucket {
  const split = hasTokenBreakdown(source)
  return {
    key: source.id,
    inputTokens: source.inputTokens,
    outputTokens: source.outputTokens,
    cacheTokens: source.cacheTokens,
    totalTokens: source.totalTokens,
    sessions: source.sessionCount,
    breakdownSessions: split ? source.sessionCount : 0,
    sourceIds: [source.id]
  }
}

/**
 * 过滤时用源级数字，避免混源日桶把 Codex 合计算进 Grok。
 * 未过滤时仍走日桶合计（与会话去重一致：每会话只在一天）。
 */
export function resolveTotals(
  sources: CliUsageSource[],
  days: CliUsageBucket[],
  selected: CliUsageSourceId | null
): CliUsageBucket {
  if (!selected) return sumBuckets(days)
  const source = sources.find((item) => item.id === selected && item.status === "has-usage")
  return source ? sourceToBucket(source) : EMPTY_TOTAL
}

export type SourceContribution = {
  source: CliUsageSource
  share: number | undefined
}

/** 有用量的源按 token 降序。份额相对全部 has-usage，不随过滤变。 */
export function rankContributions(sources: CliUsageSource[]): SourceContribution[] {
  const active = sources.filter((item) => item.status === "has-usage")
  const total = active.reduce((sum, item) => sum + item.totalTokens, 0)
  return [...active]
    .sort(
      (left, right) =>
        right.totalTokens - left.totalTokens || right.sessionCount - left.sessionCount
    )
    .map((source) => ({ source, share: sharePercent(source.totalTokens, total) }))
}

const IDLE_ORDER: readonly CliUsageSourceStatus[] = [
  "scanned-empty",
  "directory-missing",
  "unsupported"
]

export function idleGroups(
  sources: CliUsageSource[]
): Array<{ status: CliUsageSourceStatus; sources: CliUsageSource[] }> {
  return IDLE_ORDER.map((status) => ({
    status,
    sources: sources.filter((item) => item.status === status)
  })).filter((group) => group.sources.length > 0)
}

export function grokTicksForView(
  sources: CliUsageSource[],
  selected: CliUsageSourceId | null
): number | undefined {
  if (selected && selected !== "grok") return undefined
  return grokRecordedTicks(sources)
}
