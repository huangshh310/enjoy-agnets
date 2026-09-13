/**
 * 本机 CLI 用量图表数据整形。
 * 聚合切片、时序趋势、模型排行与日格热力数据，保证纯函数无副作用。
 */
import type { CliTranscriptUsage, CliUsageSourceId } from "@enjoy-agents/ipc-contract"
import type { SpendSlice } from "@renderer/components/settings/agent-tools/charts/spend-chart-colors"
import { formatTokens } from "@renderer/components/settings/agent-tools/format-spend"
import type { TranslateFn } from "@renderer/i18n"
import { filterBuckets } from "../lib/filter"
import { formatBucketLabel } from "../lib/format"
import { sourceNameKey } from "../lib/source-chip-copy"

export type CliUsageDayPoint = {
  day: string
  rawDay: string
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  totalTokens: number
}

export type CliUsageChartModel = {
  cliSlices: SpendSlice[]
  modelSlices: SpendSlice[]
  daysTrend: CliUsageDayPoint[]
  dailyTotal: Array<{ day: string; total: number }>
  composed: Array<{ day: string; tokens: number; cumulative: number }>
  modelRanking: SpendSlice[]
  growth: Array<{ day: string; total: number }>
  totalTokens: number
}

export function buildCliUsageChartModel(
  usage: CliTranscriptUsage,
  selectedId: CliUsageSourceId | null,
  t: TranslateFn
): CliUsageChartModel {
  // 1. CLI 来源环形图切片
  const activeSources = usage.sources.filter(
    (item) => item.status === "has-usage" && item.totalTokens > 0
  )
  const cliSlices: SpendSlice[] = activeSources
    .map((source) => ({
      id: source.id,
      label: t(sourceNameKey(source.id)),
      amount: source.totalTokens,
      displayAmount: formatTokens(source.totalTokens)
    }))
    .sort((a, b) => b.amount - a.amount)

  // 2. 模型环形图切片与排行（Top 7 + 其它）
  const activeModels = (usage.models ?? []).filter((item) => item.totalTokens > 0)
  const sortedModels = [...activeModels].sort((a, b) => b.totalTokens - a.totalTokens)
  const topModels = sortedModels.slice(0, 7)
  const restModels = sortedModels.slice(7)
  const restTokens = restModels.reduce((sum, item) => sum + item.totalTokens, 0)

  const modelSlices: SpendSlice[] = topModels.map((item) => ({
    id: item.key,
    label: formatBucketLabel(item.key, t),
    amount: item.totalTokens,
    displayAmount: formatTokens(item.totalTokens)
  }))
  if (restTokens > 0) {
    modelSlices.push({
      id: "other-models",
      label: t("pages.observability.cliUsageOtherModels", { n: restModels.length }),
      amount: restTokens,
      displayAmount: formatTokens(restTokens)
    })
  }

  // 模型全排行（用于横向条形图，取 Top 12）
  const modelRanking: SpendSlice[] = sortedModels.slice(0, 12).map((item) => ({
    id: item.key,
    label: formatBucketLabel(item.key, t),
    amount: item.totalTokens,
    displayAmount: formatTokens(item.totalTokens)
  }))

  // 3. 时序趋势：按日期由远及近排序
  const filteredDays = filterBuckets(usage.days ?? [], selectedId)
  const chronologicalDays = [...filteredDays]
    .filter((bucket) => bucket.key !== "—" && bucket.key !== "")
    .sort((a, b) => a.key.localeCompare(b.key))

  const daysTrend: CliUsageDayPoint[] = chronologicalDays.map((bucket) => ({
    day: bucket.key.length >= 10 ? bucket.key.slice(5) : bucket.key,
    rawDay: bucket.key,
    inputTokens: bucket.inputTokens,
    outputTokens: bucket.outputTokens,
    cacheTokens: bucket.cacheTokens,
    totalTokens: bucket.totalTokens
  }))

  // 4. 日格热力图数据
  const dailyTotal = chronologicalDays.map((bucket) => ({
    day: bucket.key,
    total: bucket.totalTokens
  }))

  // 5. 组合图与增长曲线数据
  let running = 0
  const growth: Array<{ day: string; total: number }> = []
  const composed: Array<{ day: string; tokens: number; cumulative: number }> = []

  for (const point of daysTrend) {
    running += point.totalTokens
    growth.push({ day: point.day, total: running })
    composed.push({
      day: point.day,
      tokens: point.totalTokens,
      cumulative: running
    })
  }

  const totalTokens = activeSources.reduce((sum, item) => sum + item.totalTokens, 0)

  return {
    cliSlices,
    modelSlices,
    daysTrend,
    dailyTotal,
    composed,
    modelRanking,
    growth,
    totalTokens
  }
}
