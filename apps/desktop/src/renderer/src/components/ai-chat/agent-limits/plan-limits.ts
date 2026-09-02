/**
 * 计划额度展示。无遥测时仍用占位百分比，不冒充模型窗口。
 */
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import type { PlanLimitItem } from "./agent-limits.types"

export function calculateRealPlanLimits(metrics: TelemetryMetric[] = []): PlanLimitItem[] {
  const now = Date.now()
  const fiveHoursAgo = now - 5 * 3600 * 1000
  const oneWeekAgo = now - 7 * 24 * 3600 * 1000

  const recent5hTokens = metrics
    .filter((m) => m.createdAt >= fiveHoursAgo)
    .reduce((sum, m) => sum + (m.inputTokens ?? 0) + (m.outputTokens ?? 0), 0)

  const fiveHourBudget = 500_000
  const fiveHourPercent = Math.min(100, Math.round((recent5hTokens / fiveHourBudget) * 100))

  const weeklyTokens = metrics
    .filter((m) => m.createdAt >= oneWeekAgo)
    .reduce((sum, m) => sum + (m.inputTokens ?? 0) + (m.outputTokens ?? 0), 0)

  const weeklyBudget = 5_000_000
  const weeklyPercent = Math.min(100, Math.round((weeklyTokens / weeklyBudget) * 100))

  return [
    {
      id: "five_hour",
      label: "5-hour limit",
      resetText: "Resets in 2 hr 46 min",
      percentage: recent5hTokens > 0 ? Math.max(5, fiveHourPercent) : 38,
      activeTokens: recent5hTokens,
      maxTokens: fiveHourBudget,
      barColorClass: "bg-accent-500"
    },
    {
      id: "weekly_all",
      label: "Weekly · all models",
      resetText: "Resets Tue 3:00 PM",
      percentage: weeklyTokens > 0 ? Math.max(3, weeklyPercent) : 3,
      activeTokens: weeklyTokens,
      maxTokens: weeklyBudget,
      barColorClass: "bg-neutral-400 dark:bg-neutral-600"
    },
    {
      id: "weekly_pro",
      label: "Weekly · Pro",
      resetText: "Resets Tue 3:00 PM",
      percentage: 5,
      barColorClass: "bg-accent-500"
    }
  ]
}

export const DEFAULT_PLAN_LIMITS: PlanLimitItem[] = [
  {
    id: "five_hour",
    label: "5-hour limit",
    resetText: "Resets in 2 hr 46 min",
    percentage: 38,
    barColorClass: "bg-accent-500"
  },
  {
    id: "weekly_all",
    label: "Weekly · all models",
    resetText: "Resets Tue 3:00 PM",
    percentage: 3,
    barColorClass: "bg-neutral-400 dark:bg-neutral-600"
  },
  {
    id: "weekly_pro",
    label: "Weekly · Pro",
    resetText: "Resets Tue 3:00 PM",
    percentage: 5,
    barColorClass: "bg-accent-500"
  }
]
