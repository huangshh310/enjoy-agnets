/**
 * 这一拍怎么处理：没到点、忙则跳过、空闲则发、次数用尽则停。
 */
import { shouldFireCron } from "./automations-cron.ts"

export type HeartbeatTickPlan = "idle" | "skip" | "fire" | "retire"

export function planHeartbeatTick(input: {
  enabled: boolean
  cronExpr: string
  timeZone: string
  lastRunAt?: number | null
  runCount: number
  maxRuns?: number | null
  blocked: boolean
  now: Date
}): HeartbeatTickPlan {
  if (!input.enabled) return "idle"
  if (input.maxRuns != null && input.runCount >= input.maxRuns) return "retire"
  const due = shouldFireCron({
    enabled: true,
    trigger: "cron",
    cronExpr: input.cronExpr,
    timeZone: input.timeZone,
    lastRunAt: input.lastRunAt ?? undefined,
    running: false,
    now: input.now
  })
  if (!due) return "idle"
  return input.blocked ? "skip" : "fire"
}
