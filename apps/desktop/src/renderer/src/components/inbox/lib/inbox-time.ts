/**
 * 收件箱相对时间与日历分组。分组按本地零点，不跨时区换算。
 */
import type { InboxGroup, InboxGroupId, InboxNotification } from "../inbox.types"

export type InboxTimeParts =
  | { key: "justNow" }
  | { key: "minutesAgo"; n: number }
  | { key: "hoursAgo"; n: number }
  | { key: "daysAgo"; n: number }

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const GROUP_ORDER: InboxGroupId[] = ["today", "yesterday", "earlier"]

export function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function inboxTimeParts(occurredAt: number, now: number): InboxTimeParts {
  const delta = Math.max(0, now - occurredAt)
  if (delta < MINUTE) return { key: "justNow" }
  if (delta < HOUR) return { key: "minutesAgo", n: Math.max(1, Math.round(delta / MINUTE)) }
  if (delta < DAY) return { key: "hoursAgo", n: Math.max(1, Math.round(delta / HOUR)) }
  return { key: "daysAgo", n: Math.max(1, Math.round(delta / DAY)) }
}

export function inboxGroupId(occurredAt: number, now: number): InboxGroupId {
  const today = startOfLocalDay(now)
  if (occurredAt >= today) return "today"
  if (occurredAt >= today - DAY) return "yesterday"
  return "earlier"
}

/** 按今天 / 昨天 / 更早分组，组内新到旧。空组丢弃。 */
export function groupInbox(items: InboxNotification[], now: number): InboxGroup[] {
  const buckets: Record<InboxGroupId, InboxNotification[]> = {
    today: [],
    yesterday: [],
    earlier: []
  }
  for (const item of items) {
    buckets[inboxGroupId(item.occurredAt, now)].push(item)
  }
  return GROUP_ORDER.flatMap((id) => {
    const groupItems = [...buckets[id]].sort((a, b) => b.occurredAt - a.occurredAt)
    return groupItems.length > 0 ? [{ id, items: groupItems }] : []
  })
}
