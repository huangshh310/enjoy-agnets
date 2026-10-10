/**
 * 待验收行：main 落库的 workflow_status，不是 Attention kind，也不看 git dirty / run.end。
 */
import type { SessionNeedsReviewItem } from "@enjoy-agents/ipc-contract"
import type { RepositoryNode } from "@renderer/stores/chat-store.types"
import type { InboxNotification } from "../inbox.types"
import { isLiveInboxSession } from "./filter-inbox"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export function inboxFromNeedsReviewSessions(
  rows: SessionNeedsReviewItem[],
  input: {
    t: Translate
    now: number
    readIds?: ReadonlySet<string>
    hiddenIds?: ReadonlySet<string>
    repositories?: RepositoryNode[]
  }
): InboxNotification[] {
  const hidden = input.hiddenIds ?? new Set<string>()
  const read = input.readIds ?? new Set<string>()
  const workspaceName = new Map<string, string>()
  for (const node of input.repositories ?? []) {
    if (node.kind === "workspace") workspaceName.set(node.id, node.name)
  }

  return rows
    .filter((row) => row.workflowStatus === "needs_review")
    .filter((row) => isLiveInboxSession(row.id, input.repositories))
    .map((session) => {
      const id = `needs_review:${session.id}`
      const workspaceId = session.workspaceId ?? undefined
      return {
        id,
        copyKey: "needs_review" as const,
        title: input.t("pages.inbox.navNeedsReview"),
        summary: input.t("sessionOps.needsReviewSummary"),
        category: "agent" as const,
        read: read.has(id),
        occurredAt: session.updatedAt || input.now,
        sessionId: session.id,
        workspaceId,
        workspaceName: workspaceId ? workspaceName.get(workspaceId) : undefined,
        actionKey: "openSession" as const,
        actionLabel: input.t("pages.inbox.actions.openSession"),
        status: "resolved" as const,
        sessionTitle: session.title,
        ...(session.changedFiles ? { changedFiles: session.changedFiles } : {}),
        ...(session.completedAt ? { completedAt: session.completedAt } : {})
      }
    })
    .filter((item) => !hidden.has(item.id))
    .sort((left, right) => right.occurredAt - left.occurredAt)
}

/** 测试 / 回落：从已灌入的会话节点收，仍只认 workflowStatus，禁止看 git。 */
export function synthesizeNeedsReviewInbox(input: {
  repositories: RepositoryNode[]
  t: Translate
  now: number
}): InboxNotification[] {
  const rows: SessionNeedsReviewItem[] = input.repositories
    .filter((node) => node.kind === "session" && node.workflowStatus === "needs_review")
    .map((session) => ({
      id: session.id,
      workspaceId: session.workspaceId ?? session.parentId ?? null,
      title: session.name,
      updatedAt: session.updatedAt,
      workflowStatus: "needs_review" as const,
      ...(session.changedFiles ? { changedFiles: session.changedFiles } : {}),
      ...(session.completedAt ? { completedAt: session.completedAt } : {})
    }))
  return inboxFromNeedsReviewSessions(rows, input)
}
