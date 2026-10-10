/**
 * 定时预设 ↔ 五段 cron。常见每天 / 工作日 / 每周可往返，其余进高级。
 */
import { parseCronPlain } from "./format-cron.ts"

export type SchedulePreset = "daily" | "weekdays" | "weekly" | "advanced"

export type ScheduleState = {
  preset: SchedulePreset
  hour: number
  minute: number
  dow: number
  cronExpr: string
}

export function scheduleFromCron(expr: string): ScheduleState {
  const parsed = parseCronPlain(expr)
  if (parsed.kind === "daily") {
    return { preset: "daily", hour: parsed.hour, minute: parsed.minute, dow: 1, cronExpr: expr }
  }
  if (parsed.kind === "weekdays") {
    return { preset: "weekdays", hour: parsed.hour, minute: parsed.minute, dow: 1, cronExpr: expr }
  }
  if (parsed.kind === "weekly") {
    return { preset: "weekly", hour: parsed.hour, minute: parsed.minute, dow: parsed.dow, cronExpr: expr }
  }
  return { preset: "advanced", hour: 9, minute: 0, dow: 1, cronExpr: expr }
}

export function cronFromSchedule(state: Omit<ScheduleState, "cronExpr"> & { cronExpr?: string }): string {
  if (state.preset === "advanced") return (state.cronExpr ?? "").trim()
  const minute = String(state.minute)
  const hour = String(state.hour)
  if (state.preset === "daily") return `${minute} ${hour} * * *`
  if (state.preset === "weekdays") return `${minute} ${hour} * * 1-5`
  return `${minute} ${hour} * * ${state.dow}`
}

export function parseClockValue(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

export function clockValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}
