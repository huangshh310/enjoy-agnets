/**
 * 收件箱档案：Attention 实况 + SQLite 归档，已读 / 隐藏跨重启耐久。
 */
import { useEffect, useMemo, useState } from "react"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import { useChatStore } from "@renderer/stores/chat-store"
import type { AttentionItem } from "@renderer/stores/attention/attention.types"
import type { InboxCategory, InboxNotification } from "./inbox.types"
import {
  filterInbox,
  inboxFromAttention,
  inboxFromPendingApprovals,
  inboxNavCounts,
  resolveSelected
} from "./lib/filter-inbox"
import { useLivePendingApprovals } from "./use-live-pending-approvals"
import { synthesizeNeedsReviewInbox } from "./lib/synthesize-needs-review-inbox"
import { groupInbox } from "./lib/inbox-time"
import { takeInboxFilter } from "./lib/pending-inbox-filter"

export function useInbox() {
  const t = useT()
  const [now] = useState(() => Date.now())
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
  const [archivedItems, setArchivedItems] = useState<AttentionItem[]>(() => [])
  const [filter, setFilter] = useState<InboxCategory>(() => takeInboxFilter() ?? "approval")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const attentionItems = useAttentionStore((state) => state.items)
  const repositories = useChatStore((state) => state.repositories)
  const pendingApprovals = useLivePendingApprovals()

  // 挂载时加载耐久层：已读 / 隐藏状态 + error/complete 归档条目。
  useEffect(() => {
    if (!hasIde()) return
    void getIde()
      .inbox.listStates()
      .then((result) => {
        const read = new Set<string>()
        const hidden = new Set<string>()
        const archived: AttentionItem[] = []
        for (const entry of result.entries) {
          if (entry.readAt != null) read.add(entry.id)
          if (entry.hiddenAt != null) hidden.add(entry.id)
          if (entry.item && entry.item.kind !== "pending_approval" && entry.item.kind !== "ask_user") {
            archived.push(archivedToAttentionItem(entry.item))
          }
        }
        setReadIds(read)
        setHiddenIds(hidden)
        setArchivedItems(archived)
      })
      .catch(() => undefined)
  }, [])

  const items = useMemo(() => {
    // 实况优先；归档条目只在实况没有同 id 时补位（error/complete 重启后的历史）。
    const liveIds = new Set(attentionItems.map((item) => item.id))
    const merged = [...attentionItems, ...archivedItems.filter((item) => !liveIds.has(item.id))]
    const attentionList = inboxFromAttention(merged, {
      t,
      readIds,
      hiddenIds,
      repositories,
      omitAttentionApprovals: true
    })
    const pendingList = inboxFromPendingApprovals(pendingApprovals, {
      t,
      readIds,
      hiddenIds,
      repositories
    })
    const reviewList = synthesizeNeedsReviewInbox({ repositories, t, now })
    return [...reviewList, ...pendingList, ...attentionList]
  }, [attentionItems, archivedItems, hiddenIds, pendingApprovals, readIds, repositories, t, now])
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
    approvalCount: counts.approval,
    unreadCount: items.filter((item) => !item.read).length,
    hasRead: items.some((item) => item.read),
    selected,
    selectItem: (item: InboxNotification) => {
      setSelectedId(item.id)
      if (!item.read) {
        setReadIds((prev) => new Set(prev).add(item.id))
        persistFlags([{ id: item.id, read: true }])
      }
    },
    markAllRead: () => {
      const unread = items.filter((item) => !item.read)
      setReadIds(new Set(items.map((item) => item.id)))
      persistFlags(unread.map((item) => ({ id: item.id, read: true })))
    },
    toggleRead: (id: string) => {
      setReadIds((prev) => {
        const next = toggleSetMember(prev, id)
        persistFlags([{ id, read: next.has(id) }])
        return next
      })
    },
    clearRead: () => {
      setHiddenIds((prev) => {
        const merged = mergeSets(prev, readIds)
        persistFlags([...readIds].map((id) => ({ id, hidden: true })))
        return merged
      })
    }
  }
}

/** 已读 / 隐藏变化写穿；失败静默（内存态仍然生效，下次操作会再带全量标志）。 */
function persistFlags(entries: Array<{ id: string; read?: boolean; hidden?: boolean }>): void {
  if (!hasIde() || entries.length === 0) return
  void getIde()
    .inbox.putStates({ entries })
    .catch(() => undefined)
}

/** 归档 JSON 补齐 AttentionItem 必填字段；核心字段由合约校验过。 */
function archivedToAttentionItem(item: Record<string, unknown> & {
  id: string
  sessionId: string
  kind: AttentionItem["kind"]
}): AttentionItem {
  return {
    status: "resolved",
    runId: "",
    occurredAt: Date.now(),
    summary: "",
    sessionTitle: "",
    ...item
  } as AttentionItem
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
