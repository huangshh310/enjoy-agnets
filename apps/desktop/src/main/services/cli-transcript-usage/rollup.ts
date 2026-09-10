/**
 * 日 / 模型 / 项目桶。含 breakdownSessions 与 sourceIds。
 */
import type { CliUsageBucket, CliUsageSourceId } from "@enjoy-agents/ipc-contract"
import { catalogIds } from "./catalog.ts"
import { MAX_PROJECT_BUCKETS } from "./constants.ts"
import type { UsageDelta } from "./parsers/parse-usage.ts"

function emptyBucket(key: string): CliUsageBucket {
  return {
    key,
    inputTokens: 0,
    outputTokens: 0,
    cacheTokens: 0,
    totalTokens: 0,
    sessions: 0,
    breakdownSessions: 0,
    sourceIds: []
  }
}

function hasBreakdown(item: UsageDelta): boolean {
  return item.inputTokens + item.outputTokens + item.cacheTokens > 0
}

function mergeSourceIds(prev: CliUsageSourceId[], id: string | undefined): CliUsageSourceId[] {
  const set = new Set(prev)
  if (id) set.add(id as CliUsageSourceId)
  return catalogIds().filter((item) => set.has(item))
}

export function rollupBuckets(
  items: UsageDelta[],
  keyOf: (item: UsageDelta) => string
): CliUsageBucket[] {
  const map = new Map<string, CliUsageBucket>()
  for (const item of items) {
    const key = keyOf(item)
    const prev = map.get(key) ?? emptyBucket(key)
    map.set(key, {
      key,
      inputTokens: prev.inputTokens + item.inputTokens,
      outputTokens: prev.outputTokens + item.outputTokens,
      cacheTokens: prev.cacheTokens + item.cacheTokens,
      totalTokens: prev.totalTokens + item.totalTokens,
      sessions: prev.sessions + 1,
      breakdownSessions: prev.breakdownSessions + (hasBreakdown(item) ? 1 : 0),
      sourceIds: mergeSourceIds(prev.sourceIds, item.sourceId)
    })
  }
  return [...map.values()].sort(
    (left, right) => right.totalTokens - left.totalTokens || right.sessions - left.sessions
  )
}

export function rollupProjects(items: UsageDelta[]): CliUsageBucket[] {
  return rollupBuckets(items, (item) => item.project || "—").slice(0, MAX_PROJECT_BUCKETS)
}

export function sumTokenFields(items: UsageDelta[]): {
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  totalTokens: number
} {
  return items.reduce(
    (acc, item) => ({
      inputTokens: acc.inputTokens + item.inputTokens,
      outputTokens: acc.outputTokens + item.outputTokens,
      cacheTokens: acc.cacheTokens + item.cacheTokens,
      totalTokens: acc.totalTokens + item.totalTokens
    }),
    { inputTokens: 0, outputTokens: 0, cacheTokens: 0, totalTokens: 0 }
  )
}

export function sumCostTicks(items: UsageDelta[]): number | undefined {
  const sum = items.reduce((acc, item) => acc + (item.costUsdTicks ?? 0), 0)
  return sum > 0 ? sum : undefined
}
