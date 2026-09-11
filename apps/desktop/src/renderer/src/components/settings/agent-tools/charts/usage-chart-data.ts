/**
 * 订阅页图廊的数据整形。全部来自 inspect 的窗口与本机 trend，不编造延迟/骑行。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { formatTokens, formatDollars } from "../format-spend"
import { spendSliceFill, type SpendSlice } from "./spend-chart-colors"

export type ChartSeries = { id: string; label: string; color: string }

export function buildUsageChartModel(tools: AgentToolPublic[], metric: "tokens" | "cost") {
  const series: ChartSeries[] = []
  const dayMap = new Map<string, Record<string, string | number>>()

  for (const [index, tool] of tools.entries()) {
    const points = tool.quotaInfo?.spend?.trend30Days ?? []
    const has = points.some((point) => (metric === "cost" ? (point.costUsd ?? 0) : point.tokens) > 0)
    if (!has) continue
    series.push({ id: tool.id, label: tool.label, color: spendSliceFill(tool.id, index) })
    for (const point of points) {
      const row = dayMap.get(point.day) ?? { day: point.day }
      row[tool.id] = metric === "cost" ? (point.costUsd ?? 0) : point.tokens
      dayMap.set(point.day, row)
    }
  }

  const days = Array.from(dayMap.values()).sort((a, b) => String(a.day).localeCompare(String(b.day)))
  const dailyTotal = days.map((row) => {
    const total = series.reduce((sum, item) => sum + Number(row[item.id] ?? 0), 0)
    return { day: String(row.day), total, ...row }
  })

  let running = 0
  const growth = dailyTotal.map((row) => {
    running += row.total
    return { day: row.day, total: running }
  })

  const composed = dailyTotal.map((row, index) => ({
    day: row.day,
    tokens: row.total,
    cumulative: growth[index]?.total ?? 0
  }))

  const percentile = dailyTotal.map((row) => {
    const values = series.map((item) => Number(row[item.id] ?? 0)).sort((a, b) => a - b)
    return {
      day: row.day,
      p50: pickPercentile(values, 0.5),
      p90: pickPercentile(values, 0.9),
      max: values[values.length - 1] ?? 0
    }
  })

  const thisWeek = sumLast(dailyTotal, 7)
  const lastWeek = sumLast(dailyTotal.slice(0, Math.max(0, dailyTotal.length - 7)), 7)
  const shipments = dailyTotal.slice(-7).map((row, index) => {
    const prev = dailyTotal[dailyTotal.length - 14 + index]
    return { day: String(row.day).slice(5), thisWeek: row.total, lastWeek: prev?.total ?? 0 }
  })

  const ranking: SpendSlice[] = series
    .map((item) => {
      const amount = dailyTotal.reduce((sum, row) => sum + Number(row[item.id] ?? 0), 0)
      return {
        id: item.id,
        label: item.label,
        amount,
        displayAmount: metric === "cost" ? formatDollars(amount) : formatTokens(amount)
      }
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const windows = tools.flatMap((tool) =>
    (tool.quotaInfo?.windows ?? [])
      .filter((item) => !item.statusText)
      .map((item) => ({
        id: `${tool.id}:${item.id}`,
        label: `${tool.label} · ${item.displayName}`,
        used: item.usedPercent,
        left: Math.max(0, 100 - item.usedPercent),
        color: spendSliceFill(tool.id)
      }))
  )

  const radar = [
    { axis: "剩余", ...Object.fromEntries(series.map((item) => [item.id, leftoverOf(tools, item.id)])) },
    { axis: "已用", ...Object.fromEntries(series.map((item) => [item.id, usedOf(tools, item.id)])) },
    { axis: "近 30 天份额", ...Object.fromEntries(series.map((item) => [item.id, shareOf(ranking, item.id)])) }
  ]

  const health = windows.length
    ? Math.round(windows.reduce((sum, item) => sum + item.left, 0) / windows.length * 10)
    : 0

  const sankey = buildSankey(tools, ranking)

  return {
    series,
    days,
    dailyTotal,
    growth,
    composed,
    percentile,
    shipments,
    thisWeek,
    lastWeek,
    ranking,
    windows,
    radar,
    health: Math.min(1000, Math.max(0, health)),
    sankey,
    metric
  }
}

export type UsageChartModel = ReturnType<typeof buildUsageChartModel>

function pickPercentile(values: number[], p: number) {
  if (values.length === 0) return 0
  const index = Math.min(values.length - 1, Math.max(0, Math.round((values.length - 1) * p)))
  return values[index] ?? 0
}

function sumLast(rows: Array<{ total: number }>, n: number) {
  return rows.slice(-n).reduce((sum, row) => sum + row.total, 0)
}

function leftoverOf(tools: AgentToolPublic[], id: string) {
  const windows = tools.find((item) => item.id === id)?.quotaInfo?.windows ?? []
  const meters = windows.filter((item) => !item.statusText)
  if (meters.length === 0) return 0
  return Math.round(meters.reduce((sum, item) => sum + (100 - item.usedPercent), 0) / meters.length)
}

function usedOf(tools: AgentToolPublic[], id: string) {
  return Math.max(0, 100 - leftoverOf(tools, id))
}

function shareOf(ranking: SpendSlice[], id: string) {
  const total = ranking.reduce((sum, item) => sum + item.amount, 0)
  if (total <= 0) return 0
  const hit = ranking.find((item) => item.id === id)
  return Math.round(((hit?.amount ?? 0) / total) * 100)
}

function buildSankey(tools: AgentToolPublic[], ranking: SpendSlice[]) {
  const nodes = [{ name: "本机消耗" }, ...ranking.map((item) => ({ name: item.label })), { name: "官方窗口" }, { name: "仅日志" }]
  const links: Array<{ source: number; target: number; value: number }> = []
  ranking.forEach((item, index) => {
    const toolIndex = index + 1
    if (item.amount <= 0) return
    links.push({ source: 0, target: toolIndex, value: item.amount })
    const hasWindows = (tools.find((tool) => tool.id === item.id)?.quotaInfo?.windows?.length ?? 0) > 0
    links.push({
      source: toolIndex,
      target: hasWindows ? nodes.length - 2 : nodes.length - 1,
      value: item.amount
    })
  })
  return { nodes, links }
}
