/**
 * 上次运行人话：今天 / 昨天 / 本周「周X」/ 上周「上周X」。周从周一起算。
 */
const ZH_WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"]
const WEEK_MS = 7 * 86_400_000

export function startOfLocalDay(at: number): number {
  const date = new Date(at)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** 本地周一 00:00。周日算上一周的末一天。 */
export function startOfLocalWeek(at: number): number {
  const date = new Date(startOfLocalDay(at))
  const day = date.getDay()
  const mondayBased = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - mondayBased)
  return date.getTime()
}

export function formatClock(at: number, _locale?: string): string {
  const date = new Date(at)
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${hour}:${minute}`
}

export function formatLastRunWhen(at: number, now: number, locale: string): string {
  const time = formatClock(at, locale)
  const zh = locale.startsWith("zh")
  const dayDiff = Math.round((startOfLocalDay(now) - startOfLocalDay(at)) / 86_400_000)
  if (dayDiff === 0) return zh ? `今天 ${time}` : `today ${time}`
  if (dayDiff === 1) return zh ? `昨天 ${time}` : `yesterday ${time}`
  const weekDiff = Math.round((startOfLocalWeek(now) - startOfLocalWeek(at)) / WEEK_MS)
  const weekday = new Date(at).getDay()
  if (weekDiff === 0) {
    return zh ? `周${ZH_WEEKDAY[weekday]} ${time}` : `${weekdayEn(weekday)} ${time}`
  }
  if (weekDiff === 1) {
    return zh ? `上周${ZH_WEEKDAY[weekday]} ${time}` : `last ${weekdayEn(weekday)} ${time}`
  }
  const date = new Date(at).toLocaleDateString(zh ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric"
  })
  return `${date} ${time}`
}

function weekdayEn(day: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day] ?? "day"
}
