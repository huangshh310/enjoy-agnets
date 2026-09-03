/**
 * 收件箱页面状态：已读 / 清理、分类过滤、当前选中消息。
 * 种子时间相对挂载时刻冻结，避免每次渲染把「10 分钟前」往后推。
 */
import { useMemo, useState } from "react"
import { useT } from "@renderer/i18n"
import { INBOX_SEEDS } from "./constants"
import type { InboxCategory, InboxNotification } from "./inbox.types"
import {
  filterInbox,
  inboxNavCounts,
  materializeInbox,
  resolveSelected
} from "./lib/filter-inbox"
import { groupInbox } from "./lib/inbox-time"

export function useInbox() {
  const t = useT()
  const [mountedAt] = useState(() => Date.now())
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
  const [filter, setFilter] = useState<InboxCategory>("all")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(INBOX_SEEDS[0]?.id ?? null)

  const items = useMemo(
    () => materializeInbox(INBOX_SEEDS, { t, now: mountedAt, readIds, hiddenIds }),
    [hiddenIds, mountedAt, readIds, t]
  )
  const filteredItems = useMemo(
    () => filterInbox(items, filter, search),
    [filter, items, search]
  )
  const groups = useMemo(() => groupInbox(filteredItems, mountedAt), [filteredItems, mountedAt])
  const counts = useMemo(() => inboxNavCounts(items), [items])
  const selected = resolveSelected(filteredItems, selectedId)

  return {
    now: mountedAt,
    filter,
    setFilter,
    search,
    setSearch,
    groups,
    counts,
    unreadCount: counts.unread,
    hasRead: items.some((item) => item.read),
    selected,
    selectItem: (item: InboxNotification) => {
      setSelectedId(item.id)
      if (!item.read) setReadIds((prev) => new Set(prev).add(item.id))
    },
    markAllRead: () => setReadIds(new Set(INBOX_SEEDS.map((seed) => seed.id))),
    toggleRead: (id: string) => setReadIds((prev) => toggleSetMember(prev, id)),
    clearRead: () => setHiddenIds((prev) => mergeSets(prev, readIds))
  }
}

function toggleSetMember(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

function mergeSets(left: Set<string>, right: Set<string>): Set<string> {
  const next = new Set(left)
  for (const id of right) next.add(id)
  return next
}
