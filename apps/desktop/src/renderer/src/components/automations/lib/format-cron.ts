/**
 * 列表 cron 人话。只认常见五段；其余回落自定义时间。
 */
export type CronPlain =
  | { kind: "daily"; hour: number; minute: number }
  | { kind: "weekdays"; hour: number; minute: number }
  | { kind: "weekly"; hour: number; minute: number; dow: number }
  | { kind: "hourly" }
  | { kind: "everyMinutes"; n: number }
  | { kind: "custom" }

const WEEKDAYS = new Set(["1-5", "MON-FRI", "mon-fri"])

export function parseCronPlain(expr: string): CronPlain {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return { kind: "custom" }
  const [minute, hour, dom, month, dow] = parts
  if (dom !== "*" || month !== "*") return { kind: "custom" }
  if (isEveryMinutes(minute, hour, dow)) {
    return { kind: "everyMinutes", n: Number(minute.slice(2)) }
  }
  if (minute === "0" && hour === "*" && dow === "*") return { kind: "hourly" }
  const parsedMinute = parseField(minute)
  const parsedHour = parseField(hour)
  if (parsedMinute == null || parsedHour == null) return { kind: "custom" }
  if (dow === "*") return { kind: "daily", hour: parsedHour, minute: parsedMinute }
  if (WEEKDAYS.has(dow)) return { kind: "weekdays", hour: parsedHour, minute: parsedMinute }
  const day = parseDow(dow)
  if (day != null) return { kind: "weekly", hour: parsedHour, minute: parsedMinute, dow: day }
  return { kind: "custom" }
}

export function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function isEveryMinutes(minute: string, hour: string, dow: string): boolean {
  if (hour !== "*" || dow !== "*") return false
  const match = /^\*\/(\d+)$/.exec(minute)
  if (!match) return false
  const n = Number(match[1])
  return Number.isInteger(n) && n >= 1 && n <= 59
}

function parseField(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  return Number(raw)
}

function parseDow(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  if (n === 7) return 0
  if (n >= 0 && n <= 6) return n
  return null
}
