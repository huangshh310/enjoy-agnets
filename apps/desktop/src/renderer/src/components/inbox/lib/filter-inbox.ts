/**
 * 收件箱纯函数：Attention → 档案行、分类搜索、未读计数。
 */
import type { AttentionItem } from "@renderer/stores/attention/attention.types"
import type { RepositoryNode } from "@renderer/stores/chat-store.types"
import type { InboxCategory, InboxKind, InboxNavCounts, InboxNotification } from "../inbox.types"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export function inboxFromAttention(
  items: AttentionItem[],
  input: {
    t: Translate
    readIds: ReadonlySet<string>
    hiddenIds: ReadonlySet<string>
    repositories?: RepositoryNode[]
  }
): InboxNotification[] {
  return items
    .filter((item) => !input.hiddenIds.has(item.id))
    .map((item) => {
      const isAborted =
        item.kind === "error" &&
        Boolean(
          item.errorMessage?.toLowerCase().includes("aborted") ||
          item.errorMessage?.toLowerCase().includes("abort") ||
          item.summary?.toLowerCase().includes("aborted")
        )
      const copyKey = isAborted ? ("aborted" as const) : item.kind
      const wsNode =
        item.workspaceId && input.repositories
          ? input.repositories.find((r) => r.id === item.workspaceId && r.kind === "workspace")
          : undefined

      return {
        id: item.id,
        copyKey,
        title: isAborted ? input.t("pages.inbox.badgeAborted") : input.t(`attention.kind.${item.kind}`),
        summary: isAborted ? input.t("pages.inbox.statusAborted") : item.summary,
        sessionTitle: item.sessionTitle,
        errorMessage: isAborted ? input.t("pages.inbox.statusAborted") : item.errorMessage,
        toolName: item.approval?.name,
        category: (item.kind === "error" && !isAborted ? "system" : "agent") as InboxKind,
        read: item.kind === "complete" || input.readIds.has(item.id),
        occurredAt: item.occurredAt,
        sessionId: item.sessionId,
        workspaceId: item.workspaceId,
        workspaceName: wsNode?.name,
        actionKey: "openSession" as const,
        actionLabel: input.t("pages.inbox.actions.openSession"),
        status: item.status,
        isAborted
      }
    })
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
    if (filter === "running" && item.status !== "running") return false
    if (
      filter === "waiting" &&
      item.copyKey !== "pending_approval" &&
      item.copyKey !== "ask_user"
    ) {
      return false
    }
    if (filter === "failed" && item.copyKey !== "error" && item.copyKey !== "aborted") {
      return false
    }
    if (filter === "complete" && item.copyKey !== "complete") {
      return false
    }

    if (!needle) return true
    return (
      item.title.toLocaleLowerCase().includes(needle) ||
      item.summary.toLocaleLowerCase().includes(needle) ||
      (item.sessionTitle?.toLocaleLowerCase().includes(needle) ?? false)
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

/** 统计各分类数量：unread 仍表示真实未读（不含 running），各栏目展示独立计数值。 */
export function inboxNavCounts(items: InboxNotification[]): InboxNavCounts {
  const unread = items.filter((item) => !item.read)
  const isWaiting = (i: InboxNotification) =>
    i.copyKey === "pending_approval" || i.copyKey === "ask_user"
  const isFailed = (i: InboxNotification) => i.copyKey === "error"
  const isComplete = (i: InboxNotification) => i.copyKey === "complete"

  return {
    all: items.length,
    unread: unread.length,
    running: items.filter((item) => item.status === "running").length,
    waiting: items.filter(isWaiting).length,
    failed: items.filter(isFailed).length,
    complete: items.filter(isComplete).length
  }
}
