/**
 * 会话行活动态：当前会话读 Composer running，后台读 parks。
 * 审批红点优先于转圈；running 不是 Attention kind。
 */
import type { AttentionItem, ParkedRun } from "@renderer/stores/attention/attention.types"

export const ACTIVE_SESSION_CAP = 8

export type SessionActivity = {
  running: boolean
  waitingReview: boolean
  /** 这条会话出错还没处理：会话页顶部「出错」条只列当前会话（luna 3cf0），别的会话靠侧栏这个点。 */
  failed?: boolean
}

export type SessionActivityInput = {
  sessionId: string
  currentId: string | null
  running: boolean
  parks: Record<string, Pick<ParkedRun, "running">>
  items: ReadonlyArray<Pick<AttentionItem, "sessionId" | "kind" | "status">>
}

export function sessionWaitingReview(
  sessionId: string,
  items: SessionActivityInput["items"]
): boolean {
  return items.some(
    (item) =>
      item.sessionId === sessionId &&
      (item.kind === "pending_approval" || item.kind === "ask_user") &&
      (item.status === "active" || item.status === "focused")
  )
}

export function sessionFailed(sessionId: string, items: SessionActivityInput["items"]): boolean {
  return items.some(
    (item) =>
      item.sessionId === sessionId &&
      item.kind === "error" &&
      (item.status === "active" || item.status === "focused")
  )
}

export function sessionIsRunning(input: SessionActivityInput): boolean {
  if (input.sessionId === input.currentId) return input.running
  return Boolean(input.parks[input.sessionId]?.running)
}

export function sessionActivity(input: SessionActivityInput): SessionActivity {
  return {
    waitingReview: sessionWaitingReview(input.sessionId, input.items),
    running: sessionIsRunning(input),
    failed: sessionFailed(input.sessionId, input.items)
  }
}

/** 钉住组：等你优先，其次仍在跑；未消 error 也钉（别的会话顶部条不列，靠侧栏红点+本组发现）。最多 8 条。 */
export function pickActiveSessions<T extends { id: string; updatedAt: number }>(
  sessions: readonly T[],
  activityOf: (id: string) => SessionActivity
): T[] {
  return sessions
    .filter((session) => {
      const activity = activityOf(session.id)
      return activity.running || activity.waitingReview || Boolean(activity.failed)
    })
    .sort((left, right) => {
      const leftWait = activityOf(left.id).waitingReview ? 1 : 0
      const rightWait = activityOf(right.id).waitingReview ? 1 : 0
      if (leftWait !== rightWait) return rightWait - leftWait
      return right.updatedAt - left.updatedAt
    })
    .slice(0, ACTIVE_SESSION_CAP)
}

/**
 * 钉住组标题：只要还有 live running / 等你 →「进行中」；
 * 组里只剩未消 error（看板已是待办）→「需处理」，避免与 workflow statusInProgress 同文案误读（gate-180 soft）。
 */
export type ActivePinLabelKey = "sessionActive" | "sessionNeedsAttention"

export function activePinLabelKey(
  activities: ReadonlyArray<Pick<SessionActivity, "running" | "waitingReview" | "failed">>
): ActivePinLabelKey {
  const hasLive = activities.some((a) => a.running || a.waitingReview)
  if (hasLive) return "sessionActive"
  const hasFailed = activities.some((a) => Boolean(a.failed))
  return hasFailed ? "sessionNeedsAttention" : "sessionActive"
}
