/**
 * 从本机 CLI transcript 用量中提取单工具近 30 天消耗走势与今日/昨日花费。
 * 对标 OpenUsage：为单工具卡片挂接今日、昨日、30天总用量与走势小图。
 */
import type { CliTranscriptUsage, ProviderSpendStats } from "@enjoy-agents/ipc-contract"
import { collectCliTranscriptUsage } from "../cli-transcript-usage/collect.ts"

const SPEND_CACHE_MS = 5 * 60 * 1000
let spendCache: { at: number; data: CliTranscriptUsage } | null = null

function usageSnapshot(): CliTranscriptUsage {
  const now = Date.now()
  if (spendCache && now - spendCache.at < SPEND_CACHE_MS) return spendCache.data
  const data = collectCliTranscriptUsage()
  spendCache = { at: now, data }
  return data
}

export function getToolSpendStats(toolId: string): ProviderSpendStats | undefined {
  try {
    const data = usageSnapshot()
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const yesterdayDate = new Date(now.getTime() - 86400000)
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10)

    let todayTokens = 0
    let yesterdayTokens = 0
    let last30Tokens = 0

    const dayMap = new Map<string, { tokens: number }>()
    const cutoff = new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10)

    for (const dayBucket of data.days) {
      if (!dayBucket.key || dayBucket.key === "—") continue
      if (dayBucket.sourceIds && !dayBucket.sourceIds.includes(toolId as never)) continue

      const tokens = dayBucket.totalTokens ?? 0
      if (tokens <= 0) continue

      dayMap.set(dayBucket.key, { tokens })
      if (dayBucket.key >= cutoff) last30Tokens += tokens

      if (dayBucket.key === todayStr) {
        todayTokens += tokens
      } else if (dayBucket.key === yesterdayStr) {
        yesterdayTokens += tokens
      }
    }

    if (last30Tokens === 0 && dayMap.size === 0) return undefined

    const trend30Days: Array<{ day: string; tokens: number }> = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const dayKey = d.toISOString().slice(0, 10)
      const entry = dayMap.get(dayKey)
      trend30Days.push({
        day: dayKey,
        tokens: entry?.tokens ?? 0
      })
    }

    return {
      today: { tokens: todayTokens },
      yesterday: { tokens: yesterdayTokens },
      last30Days: { tokens: last30Tokens },
      trend30Days
    }
  } catch {
    return undefined
  }
}
