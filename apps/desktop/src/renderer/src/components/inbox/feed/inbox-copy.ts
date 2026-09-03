/**
 * 收件箱行 / 阅读器共用的分类与相对时间文案。
 */
import type { InboxGroupId, InboxKind } from "../inbox.types"
import { inboxTimeParts } from "../lib/inbox-time"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export function inboxCategoryLabel(kind: InboxKind, t: Translate): string {
  return kind === "agent" ? t("pages.inbox.categoryAgent") : t("pages.inbox.categorySystem")
}

export function inboxTimeLabel(occurredAt: number, now: number, t: Translate): string {
  const parts = inboxTimeParts(occurredAt, now)
  if (parts.key === "justNow") return t("pages.inbox.justNow")
  return t(`pages.inbox.${parts.key}`, { n: parts.n })
}

export function inboxGroupLabel(id: InboxGroupId, t: Translate): string {
  if (id === "today") return t("pages.inbox.groupToday")
  if (id === "yesterday") return t("pages.inbox.groupYesterday")
  return t("pages.inbox.groupEarlier")
}
