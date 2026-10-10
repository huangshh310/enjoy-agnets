/**
 * 收件箱纯函数：Attention → 档案行。安静筛只要拍板 / 待验收 / 失败。
 */
import type { PendingApprovalItem } from "@enjoy-agents/ipc-contract"
import { ASK_USER_QUESTIONS_TOOL } from "@enjoy-agents/ipc-contract/tool-names"
import type { AttentionItem } from "@renderer/stores/attention/attention.types"
import type { RepositoryNode } from "@renderer/stores/chat-store.types"
import { desktopActSafeErrorText } from "../../ai-chat/thread/desktop-act-failed-copy.ts"
import { humanizeThreadError } from "../../../lib/usage/classify-thread-error.ts"
import type { InboxCategory, InboxKind, InboxNavCounts, InboxNotification } from "../inbox.types"

type Translate = (path: string, vars?: Record<string, string | number>) => string

function humanizeInboxError(text: string | undefined, t: Translate): string {
  if (!text) return ""
  return desktopActSafeErrorText(text, t) ?? humanizeThreadError(text, t)
}

export function isApprovalItem(item: InboxNotification): boolean {
  return item.copyKey === "pending_approval" || item.copyKey === "ask_user"
}

/** 拍板只认活会话上仍 active/focused 的未决；已决与已归档会话不进 Inbox / 徽标。 */
function isLiveInboxAttention(
  item: AttentionItem,
  repositories?: RepositoryNode[]
): boolean {
  if (item.kind === "pending_approval" || item.kind === "ask_user") {
    if (item.status !== "active" && item.status !== "focused") return false
  }
  return isLiveInboxSession(item.sessionId, repositories)
}

export function isLiveInboxSession(sessionId: string, repositories?: RepositoryNode[]): boolean {
  if (!repositories) return true
  const liveSessions = repositories.filter((row) => row.kind === "session")
  if (liveSessions.length === 0) return false
  return liveSessions.some((row) => row.id === sessionId)
}

export function isFailedItem(item: InboxNotification): boolean {
  return item.copyKey === "error" || item.copyKey === "aborted"
}

export function isQuietInboxItem(item: InboxNotification): boolean {
  return isApprovalItem(item) || isFailedItem(item) || item.copyKey === "needs_review"
}

export function inboxFromPendingApprovals(
  rows: PendingApprovalItem[],
  input: {
    t: Translate
    readIds: ReadonlySet<string>
    hiddenIds: ReadonlySet<string>
    repositories?: RepositoryNode[]
  }
): InboxNotification[] {
  return rows
    .filter((row) => isLiveInboxSession(row.sessionId, input.repositories))
    .map((row) => {
      const ask = row.name === ASK_USER_QUESTIONS_TOOL
      const copyKey = ask ? ("ask_user" as const) : ("pending_approval" as const)
      const id = `apr:${row.id}`
      return {
        id,
        copyKey,
        title: input.t(`attention.kind.${copyKey}`),
        summary: row.targetShortName
          ? `${row.sessionTitle} · ${row.name} · ${row.targetShortName}`
          : `${row.sessionTitle} · ${row.name}`,
        sessionTitle: row.sessionTitle,
        toolName: row.name,
        category: "agent" as InboxKind,
        read: input.readIds.has(id),
        occurredAt: row.createdAt,
        sessionId: row.sessionId,
        workspaceId: row.workspaceId ?? undefined,
        actionKey: "openSession" as const,
        actionLabel: input.t("pages.inbox.actions.openSession"),
        status: "active" as const,
        canOpenApproval: row.args != null
      }
    })
    .filter((item) => !input.hiddenIds.has(item.id))
}

export function inboxFromAttention(
  items: AttentionItem[],
  input: {
    t: Translate
    readIds: ReadonlySet<string>
    hiddenIds: ReadonlySet<string>
    repositories?: RepositoryNode[]
    omitAttentionApprovals?: boolean
  }
): InboxNotification[] {
  return items
    .filter((item) => !input.hiddenIds.has(item.id))
    .filter((item) => {
      if (
        input.omitAttentionApprovals &&
        (item.kind === "pending_approval" || item.kind === "ask_user")
      ) {
        return false
      }
      return true
    })
    .filter((item) => isLiveInboxAttention(item, input.repositories))
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
        summary: isAborted ? input.t("pages.inbox.statusAborted") : humanizeInboxError(item.summary, input.t),
        sessionTitle: item.sessionTitle,
        errorMessage: isAborted
          ? input.t("pages.inbox.statusAborted")
          : humanizeInboxError(item.errorMessage, input.t),
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
    .filter(isQuietInboxItem)
    .sort((left, right) => right.occurredAt - left.occurredAt)
}

export function filterInbox(
  items: InboxNotification[],
  filter: InboxCategory,
  query: string
): InboxNotification[] {
  const needle = query.trim().toLocaleLowerCase()
  return items.filter((item) => {
    if (filter === "approval" && !isApprovalItem(item)) return false
    if (filter === "needs_review" && item.copyKey !== "needs_review") return false
    if (filter === "failed" && !isFailedItem(item)) return false

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

/** 三筛计数。徽标只用 approval（拍板），不计待验收 / 失败 / 运行中。 */
export function inboxNavCounts(items: InboxNotification[]): InboxNavCounts {
  return {
    approval: items.filter(isApprovalItem).length,
    needs_review: items.filter((item) => item.copyKey === "needs_review").length,
    failed: items.filter(isFailedItem).length
  }
}
