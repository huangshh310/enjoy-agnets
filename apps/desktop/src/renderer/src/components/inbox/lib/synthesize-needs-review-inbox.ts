/**
 * 待验收行：会话 workflowStatus，不是 Attention kind，也不进拍板徽标。
 */
import type { RepositoryNode } from "@renderer/stores/chat-store.types"
import type { InboxNotification } from "../inbox.types"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export function synthesizeNeedsReviewInbox(input: {
  repositories: RepositoryNode[]
  t: Translate
  now: number
}): InboxNotification[] {
  const workspaceName = new Map<string, string>()
  for (const node of input.repositories) {
    if (node.kind === "workspace") workspaceName.set(node.id, node.name)
  }

  return input.repositories
    .filter((node) => node.kind === "session" && node.workflowStatus === "needs_review")
    .map((session) => {
      const parentId = session.parentId ?? session.workspaceId
      return {
        id: `needs_review:${session.id}`,
        copyKey: "needs_review" as const,
        title: input.t("pages.inbox.navNeedsReview"),
        summary: input.t("sessionOps.needsReviewSummary"),
        category: "agent" as const,
        read: true,
        occurredAt: session.updatedAt || input.now,
        sessionId: session.id,
        workspaceId: parentId,
        workspaceName: parentId ? workspaceName.get(parentId) : undefined,
        actionKey: "openSession" as const,
        actionLabel: input.t("pages.inbox.actions.openSession"),
        status: "resolved" as const,
        sessionTitle: session.name
      }
    })
    .sort((left, right) => right.occurredAt - left.occurredAt)
}
