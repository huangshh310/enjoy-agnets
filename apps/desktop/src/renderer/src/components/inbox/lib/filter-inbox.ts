/**
 * 收件箱纯函数：Attention → 档案行、分类搜索、未读计数。
 */
import type { AttentionItem } from "@renderer/stores/attention/attention.types"
import type { InboxCategory, InboxKind, InboxNavCounts, InboxNotification } from "../inbox.types"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export function inboxFromAttention(
  items: AttentionItem[],
  input: {
    t: Translate
    readIds: ReadonlySet<string>
    hiddenIds: ReadonlySet<string>
  }
): InboxNotification[] {
  return items
    .filter((item) => !input.hiddenIds.has(item.id))
    .map((item) => ({
      id: item.id,
      copyKey: item.kind,
      title: input.t(`attention.kind.${item.kind}`),
      summary: item.summary,
      category: (item.kind === "error" ? "system" : "agent") as InboxKind,
      read: item.kind === "complete" || input.readIds.has(item.id),
      occurredAt: item.occurredAt,
      sessionId: item.sessionId,
      workspaceId: item.workspaceId,
      actionKey: "openSession" as const,
      actionLabel: input.t("pages.inbox.actions.openSession"),
      status: item.status
    }))
    .sort((left, right) => right.occurredAt - left.occurredAt)
}

export function filterInbox(
  items: InboxNotification[],
  filter: InboxCategory,
  query: string
): InboxNotification[] {
  const needle = query.trim().toLocaleLowerCase()
  return items.filter((item) => {
    if (filter === "unread" && item.read) return false
    if (filter === "agent" && item.category !== "agent") return false
    if (filter === "system" && item.category !== "system") return false
    if (!needle) return true
    return (
      item.title.toLocaleLowerCase().includes(needle) ||
      item.summary.toLocaleLowerCase().includes(needle)
    )
  })
}

/** 当前过滤结果里的选中项；选中已不在列表中时回落到第一封。 */
export function resolveSelected(
  items: InboxNotification[],
  selectedId: string | null
): InboxNotification | null {
  if (items.length === 0) return null
  return items.find((item) => item.id === selectedId) ?? items[0] ?? null
}

/** 侧栏徽标只统计未读，已读不占注意力。 */
export function inboxNavCounts(items: InboxNotification[]): InboxNavCounts {
  const unread = items.filter((item) => !item.read)
  return {
    all: unread.length,
    unread: unread.length,
    agent: unread.filter((item) => item.category === "agent").length,
    system: unread.filter((item) => item.category === "system").length
  }
}
