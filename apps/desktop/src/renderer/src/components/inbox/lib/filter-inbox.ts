/**
 * 收件箱纯函数：物化种子、分类搜索、未读计数。
 */
import type {
  InboxCategory,
  InboxNavCounts,
  InboxNotification,
  InboxSeed
} from "../inbox.types"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export function materializeInbox(
  seeds: InboxSeed[],
  input: {
    t: Translate
    now: number
    readIds: ReadonlySet<string>
    hiddenIds: ReadonlySet<string>
  }
): InboxNotification[] {
  return seeds
    .filter((seed) => !input.hiddenIds.has(seed.id))
    .map((seed) => ({
      id: seed.id,
      copyKey: seed.copyKey,
      title: input.t(`pages.inbox.seed.${seed.copyKey}Title`),
      summary: input.t(`pages.inbox.seed.${seed.copyKey}Summary`),
      category: seed.category,
      read: input.readIds.has(seed.id),
      occurredAt: input.now - seed.offsetMs,
      actionKey: seed.actionKey,
      actionLabel: seed.actionKey
        ? input.t(`pages.inbox.actions.${seed.actionKey}`)
        : undefined
    }))
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
