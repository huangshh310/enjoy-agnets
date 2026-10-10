/**
 * 个人中心遥测聚合：只统计真实 metrics，空窗格为 0 / "—"，不补正弦波或占位 KPI。
 */
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import type {
  AgentBarPoint,
  HeatmapCellData,
  HeatmapPeriod,
  ProfileMetricSummary,
  TokenTrendPoint
} from "../types/profile.types"

/** 将活跃次数映射到 0~4 热力阶。 */
export function heatmapLevel(count: number): HeatmapCellData["level"] {
  if (count <= 0) return 0
  if (count <= 3) return 1
  if (count <= 6) return 2
  if (count <= 10) return 3
  return 4
}

/** 将 token 规模格式化为短字串；0 显示 "0"。 */
export function formatTokenAmount(tokens: number): string {
  if (tokens <= 0) return "0"
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}B`
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`
  return `${Math.round(tokens)}`
}

/** 真实花费：有小数留两位，整数不补 .00。 */
export function formatSpendUsd(usd: number): string {
  const rounded = Math.round(Math.max(0, usd) * 100) / 100
  const digits = Number.isInteger(rounded) ? 0 : 2
  return `$${rounded.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2
  })}`
}

/** 兼容旧测试：条数不当花费。新花费行走 formatSpendUsd。 */
export function formatContributionUsd(count: number): string {
  return formatSpendUsd(count)
}

/** 将毫秒耗时格式化为紧凑时长；无效值返回破折号。 */
export function formatDurationMs(ms: number): string {
  if (ms <= 0) return "—"
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) {
    const seconds = Math.round((ms % 60_000) / 1000)
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`
}

/** 本地日历日 YYYY-MM-DD，避免 UTC 切日偏移。 */
export function dayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long" })
}

/** 下一月不超过当前月。 */
export function clampNextMonth(current: Date, now = new Date()): Date {
  const next = addMonths(current, 1)
  return next.getTime() > startOfMonth(now).getTime() ? current : next
}

export function heatmapDayCount(period: HeatmapPeriod): number {
  if (period === "weekly") return 56
  if (period === "monthly") return 140
  return 364
}

function metricDayKey(metric: TelemetryMetric): string {
  return dayKey(new Date(metric.createdAt))
}

function tokenOf(metric: TelemetryMetric): number {
  return (metric.inputTokens ?? 0) + (metric.outputTokens ?? 0)
}

function countByDay(metrics: TelemetryMetric[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const metric of metrics) {
    const key = metricDayKey(metric)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

/** 连续有活跃的最长天数。 */
export function computeTopStreak(cells: HeatmapCellData[]): number {
  let best = 0
  let current = 0
  for (const cell of cells) {
    if (cell.count > 0) {
      current += 1
      if (current > best) best = current
    } else {
      current = 0
    }
  }
  return best
}

function yearBounds(now: Date, yearOffset: number): { start: number; end: number } {
  const year = now.getFullYear() + yearOffset
  return {
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year + 1, 0, 1).getTime()
  }
}

/** 环比胶囊。没有上年/上月基数时不编 +100%。 */
export function growthLabel(current: number, previous: number): string {
  if (previous <= 0) return ""
  const percent = ((current - previous) / previous) * 100
  const sign = percent >= 0 ? "+" : ""
  return `${sign}${percent.toFixed(1)}%`
}

/**
 * 本年真实花费：只加有限的 estimatedCostUsd。没有来源返回 null，不编 $0。
 * TODO(kai): 跟进 PR 提供本年 estimatedCostUsd + unknownCount；未知花费不得画 $0。
 */
export function yearSpendUsdFromMetrics(
  metrics: TelemetryMetric[],
  now = new Date()
): number | null {
  const thisYear = yearBounds(now, 0)
  return sumEstimatedCostUsd(metrics, thisYear.start, thisYear.end)
}

function sumEstimatedCostUsd(
  metrics: TelemetryMetric[],
  start: number,
  end: number
): number | null {
  let sum = 0
  let found = false
  for (const metric of metrics) {
    if (metric.createdAt < start || metric.createdAt >= end) continue
    const usd = metric.estimatedCostUsd
    if (typeof usd !== "number" || !Number.isFinite(usd)) continue
    sum += usd
    found = true
  }
  return found ? sum : null
}

/** 年度 KPI：只来自 metrics，缺数据不回落假数。 */
export function buildSummary(
  metrics: TelemetryMetric[],
  now = new Date()
): ProfileMetricSummary {
  let totalTokens = 0
  let peak = 0
  let longest = 0
  const thisYear = yearBounds(now, 0)
  const lastYear = yearBounds(now, -1)
  let thisYearCount = 0
  let lastYearCount = 0

  for (const metric of metrics) {
    const tokens = tokenOf(metric)
    totalTokens += tokens
    if (tokens > peak) peak = tokens
    if ((metric.durationMs ?? 0) > longest) longest = metric.durationMs ?? 0
    if (metric.createdAt >= thisYear.start && metric.createdAt < thisYear.end) {
      thisYearCount += 1
    }
    if (metric.createdAt >= lastYear.start && metric.createdAt < lastYear.end) {
      lastYearCount += 1
    }
  }

  const yearSpendUsd = yearSpendUsdFromMetrics(metrics, now)
  const lastYearSpend = sumEstimatedCostUsd(metrics, lastYear.start, lastYear.end)
  const streak = computeTopStreak(buildHeatmap(metrics, "yearly", now))
  return {
    contributionsCount: thisYearCount,
    contributionsGrowth:
      yearSpendUsd == null || lastYearSpend == null ? "" : growthLabel(yearSpendUsd, lastYearSpend),
    yearSpendUsd,
    lifetimeTokens: formatTokenAmount(totalTokens),
    peakTokens: formatTokenAmount(peak),
    longestTaskDuration: longest > 0 ? formatDurationMs(longest) : "—",
    topStreakDays: `${streak}d`
  }
}

/** 热力图：窗口内每天真实次数，空日为 0。 */
export function buildHeatmap(
  metrics: TelemetryMetric[],
  period: HeatmapPeriod,
  now = new Date()
): HeatmapCellData[] {
  const days = heatmapDayCount(period)
  const counts = countByDay(metrics)
  const result: HeatmapCellData[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    const date = dayKey(target)
    const count = counts.get(date) ?? 0
    result.push({ date, count, level: heatmapLevel(count) })
  }
  return result
}

/** 选中月份每天的 run 次数。 */
export function buildDailyCounts(
  metrics: TelemetryMetric[],
  month: Date,
  now = new Date()
): AgentBarPoint[] {
  const counts = countByDay(metrics)
  const today = dayKey(now)
  const points: AgentBarPoint[] = []
  const totalDays = daysInMonth(month)
  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day)
    const key = dayKey(date)
    points.push({
      id: key,
      label: `${month.getMonth() + 1}/${day}`,
      count: counts.get(key) ?? 0,
      isToday: key === today
    })
  }
  return points
}

/** 选中月份每天的 token 合计。 */
export function buildDailyTokens(
  metrics: TelemetryMetric[],
  month: Date
): TokenTrendPoint[] {
  const tokensByDay = new Map<string, number>()
  for (const metric of metrics) {
    const key = metricDayKey(metric)
    tokensByDay.set(key, (tokensByDay.get(key) ?? 0) + tokenOf(metric))
  }
  const points: TokenTrendPoint[] = []
  const totalDays = daysInMonth(month)
  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day)
    const key = dayKey(date)
    const tokens = tokensByDay.get(key) ?? 0
    points.push({
      id: key,
      label: `${month.getMonth() + 1}/${day}`,
      tokens,
      formatted: formatTokenAmount(tokens)
    })
  }
  return points
}

function monthTokenTotal(metrics: TelemetryMetric[], month: Date): number {
  const start = startOfMonth(month).getTime()
  const end = addMonths(month, 1).getTime()
  let total = 0
  for (const metric of metrics) {
    if (metric.createdAt >= start && metric.createdAt < end) total += tokenOf(metric)
  }
  return total
}

/** 相对上月的 token 环比胶囊（始终有文案）。 */
export function tokenGrowthLabel(metrics: TelemetryMetric[], month: Date): string {
  return growthLabel(monthTokenTotal(metrics, month), monthTokenTotal(metrics, addMonths(month, -1)))
}
