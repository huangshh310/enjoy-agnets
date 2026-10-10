/**
 * 侧栏相对时间：刚刚 / N 分钟 / N 小时 / 昨天。
 * 禁止把 now / 3m 摊到中文面上。
 */
import { startOfLocalDay } from "../components/inbox/lib/inbox-time"

export type SidebarTimeParts =
  | { key: "justNow" }
  | { key: "minutes"; n: number }
  | { key: "hours"; n: number }
  | { key: "yesterday" }
  | { key: "days"; n: number }

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

type Translate = (path: string, vars?: Record<string, string | number>) => string

export function sidebarTimeParts(timestamp: number, now = Date.now()): SidebarTimeParts | null {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null
  const delta = Math.max(0, now - timestamp)
  if (delta < MINUTE) return { key: "justNow" }
  if (delta < HOUR) return { key: "minutes", n: Math.max(1, Math.round(delta / MINUTE)) }
  const today = startOfLocalDay(now)
  if (timestamp >= today) return { key: "hours", n: Math.max(1, Math.round(delta / HOUR)) }
  if (timestamp >= today - DAY) return { key: "yesterday" }
  return { key: "days", n: Math.max(2, Math.round(delta / DAY)) }
}

export function formatSidebarTime(timestamp: number, t: Translate, now = Date.now()): string {
  const parts = sidebarTimeParts(timestamp, now)
  if (!parts) return ""
  if (parts.key === "justNow") return t("chat.timeJustNow")
  if (parts.key === "yesterday") return t("chat.timeYesterday")
  if (parts.key === "minutes") return t("chat.timeMinutes", { n: parts.n })
  if (parts.key === "hours") return t("chat.timeHours", { n: parts.n })
  return t("chat.timeDays", { n: parts.n })
}
