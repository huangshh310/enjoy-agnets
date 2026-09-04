/**
 * 个人画像分析 Hook：订阅 observability.metrics，再交给纯函数聚合。
 */
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { HeatmapPeriod } from "../types/profile.types"
import {
  addMonths,
  buildDailyCounts,
  buildDailyTokens,
  buildHeatmap,
  buildSummary,
  clampNextMonth,
  monthLabel,
  startOfMonth,
  tokenGrowthLabel
} from "../lib/profile-metrics"

export function useProfileAnalytics() {
  const [heatmapPeriod, setHeatmapPeriod] = useState<HeatmapPeriod>("yearly")
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))

  const metricsQuery = useQuery({
    queryKey: ["profile-telemetry-metrics"],
    enabled: hasIde(),
    queryFn: async (): Promise<TelemetryMetric[]> => {
      try {
        return (await getIde().observability.metrics({ limit: 500 })) as TelemetryMetric[]
      } catch {
        return []
      }
    }
  })

  const rawMetrics = metricsQuery.data ?? []

  const summary = useMemo(() => buildSummary(rawMetrics), [rawMetrics])
  const heatmapData = useMemo(
    () => buildHeatmap(rawMetrics, heatmapPeriod),
    [rawMetrics, heatmapPeriod]
  )
  const agentBarPoints = useMemo(
    () => buildDailyCounts(rawMetrics, monthCursor),
    [rawMetrics, monthCursor]
  )
  const tokenTrendPoints = useMemo(
    () => buildDailyTokens(rawMetrics, monthCursor),
    [rawMetrics, monthCursor]
  )
  const tokensGrowth = useMemo(
    () => tokenGrowthLabel(rawMetrics, monthCursor),
    [rawMetrics, monthCursor]
  )
  const totalAgentsCount = useMemo(
    () => agentBarPoints.reduce((sum, point) => sum + point.count, 0),
    [agentBarPoints]
  )

  const canGoNextMonth = monthCursor.getTime() < startOfMonth(new Date()).getTime()

  return {
    summary,
    heatmapData,
    heatmapPeriod,
    setHeatmapPeriod,
    agentBarPoints,
    tokenTrendPoints,
    tokensGrowth,
    totalAgentsCount,
    currentMonthLabel: monthLabel(monthCursor),
    canGoNextMonth,
    goPrevMonth: () => setMonthCursor((cursor) => addMonths(cursor, -1)),
    goNextMonth: () => setMonthCursor((cursor) => clampNextMonth(cursor))
  }
}
