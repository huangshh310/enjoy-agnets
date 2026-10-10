/**
 * 上次运行人话：今天 / 昨天 / 上周五，不要「实时在线」。
 */
const ZH_WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"]

export function startOfLocalDay(at: number): number {
  const date = new Date(at)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
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
  if (dayDiff > 1 && dayDiff < 7) {
    const weekday = new Date(at).getDay()
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
