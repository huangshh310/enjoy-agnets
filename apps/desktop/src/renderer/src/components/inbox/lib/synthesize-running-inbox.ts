/**
 * 合成 Activity 运行中条目：前台 run 与后台 parks。
 * 注意：read 设为 true，绝不计入 Attention 侧栏红点未读数。
 */
import type { AttentionItem } from "@renderer/stores/attention/attention.types"
import type { RepositoryNode } from "@renderer/stores/chat-store.types"
import type { InboxNotification } from "../inbox.types"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export function synthesizeRunningInbox(options: {
  parks: Record<string, { running?: boolean; createdAt?: number }>
  fgRunning: boolean
  fgSessionId: string | null
  fgSessionTitle: string
  fgWorkspaceId: string | null
  fgStartedAt: number | null
  repositories: RepositoryNode[]
  attentionItems: AttentionItem[]
  t: Translate
  now: number
}): InboxNotification[] {
  const {
    parks,
    fgRunning,
    fgSessionId,
    fgSessionTitle,
    fgWorkspaceId,
    fgStartedAt,
    repositories,
    attentionItems,
    t,
    now
  } = options

  const runningList: InboxNotification[] = []
  const liveWaitingSessionIds = new Set(
    attentionItems
      .filter(
        (i) =>
          (i.kind === "pending_approval" || i.kind === "ask_user") &&
          (i.status === "active" || i.status === "focused")
      )
      .map((i) => i.sessionId)
  )

  // 1. 前台正在运行的会话（且非处于 waiting_review）
  if (fgRunning && fgSessionId && !liveWaitingSessionIds.has(fgSessionId)) {
    runningList.push({
      id: `running:${fgSessionId}`,
      copyKey: "running",
      title: fgSessionTitle || t("chat.sessionActive"),
      summary: t("chat.sessionActive"),
      category: "agent",
      read: true,
      occurredAt: fgStartedAt ?? now,
      sessionId: fgSessionId,
      workspaceId: fgWorkspaceId ?? undefined,
      actionKey: "openSession",
      actionLabel: t("pages.inbox.actions.openSession"),
      status: "running"
    })
  }

  // 2. 后台 parks 正在运行的会话（去重前台与 waitingReview）
  for (const [sId, park] of Object.entries(parks)) {
    if (park.running && sId !== fgSessionId && !liveWaitingSessionIds.has(sId)) {
      const repoNode = repositories.find((r) => r.id === sId)
      runningList.push({
        id: `running:${sId}`,
        copyKey: "running",
        title: repoNode?.name || t("chat.sessionActive"),
        summary: t("chat.sessionActive"),
        category: "agent",
        read: true,
        occurredAt: park.createdAt ?? now,
        sessionId: sId,
        workspaceId: repoNode?.workspaceId,
        actionKey: "openSession",
        actionLabel: t("pages.inbox.actions.openSession"),
        status: "running"
      })
    }
  }

  return runningList
}
