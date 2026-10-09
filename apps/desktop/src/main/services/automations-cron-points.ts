/**
 * 回看窗口内的 cron 计划点。只认五段表达式，上限由调用方裁 7 天。
 */
import { cronMatches, parseCronExpr } from "./automations-cron.ts"

const MINUTE_MS = 60_000

/** UTC 分钟槽，同一计划点的稳定键。 */
export function alignCronMinute(ms: number): number {
  return Math.floor(ms / MINUTE_MS) * MINUTE_MS
}

/** 幂等 commandId：自动化 + 计划分钟，启动/唤醒/重启共用。 */
export function scheduledAutomationCommandId(automationId: string, scheduledAt: number): string {
  return `auto:${automationId}:${alignCronMinute(scheduledAt)}`
}

/**
 * [fromMs, toMs] 内命中的分钟点，升序。非法 cron 空列表。
 * 按 UTC 分钟步进再交给 cronMatches 看时区，避免漏 DST 槽。
 */
export function listCronPoints(input: {
  cronExpr: string
  timeZone: string
  fromMs: number
  toMs: number
}): number[] {
  const expr = input.cronExpr.trim()
  if (!expr || !parseCronExpr(expr)) return []
  const from = alignCronMinute(input.fromMs)
  const to = alignCronMinute(input.toMs)
  if (to < from) return []
  const tz = input.timeZone.trim() || "UTC"
  const points: number[] = []
  for (let slot = from; slot <= to; slot += MINUTE_MS) {
    if (cronMatches(expr, new Date(slot), tz)) points.push(slot)
  }
  return points
}
