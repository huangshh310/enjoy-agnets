/**
 * 收件箱档案：Attention 实况，本地已读 / 清理。
 */
import { useMemo, useState } from "react"
import { useT } from "@renderer/i18n"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import type { InboxCategory, InboxNotification } from "./inbox.types"
import {
  filterInbox,
  inboxFromAttention,
  inboxNavCounts,
  resolveSelected
} from "./lib/filter-inbox"
import { groupInbox } from "./lib/inbox-time"

export function useInbox() {
  const t = useT()
  const [now] = useState(() => Date.now())
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
  const [filter, setFilter] = useState<InboxCategory>("all")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const attentionItems = useAttentionStore((state) => state.items)

  const items = useMemo(
    () => inboxFromAttention(attentionItems, { t, readIds, hiddenIds }),
    [attentionItems, hiddenIds, readIds, t]
  )
  const filteredItems = useMemo(
    () => filterInbox(items, filter, search),
    [filter, items, search]
  )
  const groups = useMemo(() => groupInbox(filteredItems, now), [filteredItems, now])
  const counts = useMemo(() => inboxNavCounts(items), [items])
  const selected = resolveSelected(filteredItems, selectedId)

  return {
    now,
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
    markAllRead: () => setReadIds(new Set(items.map((item) => item.id))),
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
