/**
 * 本机 5 段 cron。关应用不补跑；只认当前分钟是否命中。
 */
const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
}

export type CronFields = {
  minute: number[] | null
  hour: number[] | null
  dayOfMonth: number[] | null
  month: number[] | null
  dayOfWeek: number[] | null
}

export type CronFireInput = {
  enabled: boolean
  trigger: string
  triggers?: string[]
  cronExpr?: string
  timeZone?: string
  lastRunAt?: number
  running?: boolean
  now: Date
}

/**
 * 五段 cron 原样保留。`15m` / `1h` / `15分钟` / `1小时` 编成 cron，不另存一种间隔。
 */
export function compileCadence(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  if (parseCronExpr(text)) return text
  const match = text.match(/^(\d+)\s*(m|h|分钟|小时)$/i)
  if (!match) return null
  const amount = Number(match[1])
  const unit = (match[2] ?? "").toLowerCase()
  if (unit === "m" || unit === "分钟") {
    if (amount < 1 || amount > 59) return null
    return `*/${amount} * * * *`
  }
  if (amount < 1 || amount > 23) return null
  return `0 */${amount} * * *`
}

export function parseCronExpr(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  try {
    return {
      minute: parseField(parts[0] ?? "", 0, 59),
      hour: parseField(parts[1] ?? "", 0, 23),
      dayOfMonth: parseField(parts[2] ?? "", 1, 31),
      month: parseField(parts[3] ?? "", 1, 12),
      dayOfWeek: parseField(parts[4] ?? "", 0, 7)
    }
  } catch {
    return null
  }
}

export function defaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

/** 当前时区分钟槽。用来防同一分钟连开两轮。 */
export function cronMinuteKey(now: Date, timeZone: string): string | null {
  const parts = zonedParts(now, timeZone)
  if (!parts) return null
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}@${timeZone}`
}

export function cronMatches(expr: string, now: Date, timeZone: string): boolean {
  const fields = parseCronExpr(expr)
  const parts = zonedParts(now, timeZone)
  if (!fields || !parts) return false
  if (!includes(fields.minute, parts.minute)) return false
  if (!includes(fields.hour, parts.hour)) return false
  if (!includes(fields.month, parts.month)) return false
  const domOk = includes(fields.dayOfMonth, parts.day)
  const dowOk = dowMatches(fields.dayOfWeek, parts.dow)
  if (fields.dayOfMonth && fields.dayOfWeek) return domOk || dowOk
  return domOk && dowOk
}

/** 到点才开；错过的小时不补。running / 同一分钟已开则跳过。 */
export function shouldFireCron(input: CronFireInput): boolean {
  if (!input.enabled || !hasTrigger(input, "cron") || input.running) return false
  const expr = input.cronExpr?.trim()
  const timeZone = input.timeZone?.trim() || "UTC"
  if (!expr || !parseCronExpr(expr)) return false
  if (!cronMatches(expr, input.now, timeZone)) return false
  if (!input.lastRunAt) return true
  const nowKey = cronMinuteKey(input.now, timeZone)
  const lastKey = cronMinuteKey(new Date(input.lastRunAt), timeZone)
  return Boolean(nowKey && lastKey && nowKey !== lastKey)
}

function parseField(token: string, min: number, max: number): number[] | null {
  if (token === "*") return null
  const values = new Set<number>()
  for (const part of token.split(",")) {
    const [rangeRaw, stepRaw] = part.split("/")
    const step = stepRaw ? Number(stepRaw) : 1
    if (!Number.isInteger(step) || step < 1) throw new Error("bad step")
    let start = min
    let end = max
    const range = rangeRaw ?? "*"
    if (range !== "*") {
      if (range.includes("-")) {
        const [left, right] = range.split("-").map(Number)
        start = left ?? Number.NaN
        end = right ?? Number.NaN
      } else {
        start = end = Number(range)
      }
    }
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || start > end) {
      throw new Error("bad range")
    }
    for (let value = start; value <= end; value += step) values.add(value)
  }
  return [...values]
}

function includes(field: number[] | null, value: number): boolean {
  return field == null || field.includes(value)
}

function dowMatches(field: number[] | null, dow: number): boolean {
  if (field == null) return true
  return field.includes(dow) || (dow === 0 && field.includes(7))
}

function zonedParts(now: Date, timeZone: string) {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23"
    })
    const map = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]))
    const dow = WEEKDAY[map.weekday ?? ""]
    if (dow == null) return null
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      dow
    }
  } catch {
    return null
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function hasTrigger(input: { trigger: string; triggers?: string[] }, kind: string): boolean {
  return input.trigger === kind || Boolean(input.triggers?.includes(kind))
}
