/**
 * 会话行活动态：当前会话读 Composer running，后台读 parks。
 * 审批红点优先于转圈；running 不是 Attention kind。
 */
import type { AttentionItem, ParkedRun } from "@renderer/stores/attention/attention.types"

export const ACTIVE_SESSION_CAP = 8

export type SessionActivity = {
  running: boolean
  waitingReview: boolean
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

export function sessionIsRunning(input: SessionActivityInput): boolean {
  if (input.sessionId === input.currentId) return input.running
  return Boolean(input.parks[input.sessionId]?.running)
}

export function sessionActivity(input: SessionActivityInput): SessionActivity {
  return {
    waitingReview: sessionWaitingReview(input.sessionId, input.items),
    running: sessionIsRunning(input)
  }
}

/** 钉住组：等你优先，其次仍在跑。最多 8 条。 */
export function pickActiveSessions<T extends { id: string; updatedAt: number }>(
  sessions: readonly T[],
  activityOf: (id: string) => SessionActivity
): T[] {
  return sessions
    .filter((session) => {
      const activity = activityOf(session.id)
      return activity.running || activity.waitingReview
    })
    .sort((left, right) => {
      const leftWait = activityOf(left.id).waitingReview ? 1 : 0
      const rightWait = activityOf(right.id).waitingReview ? 1 : 0
      if (leftWait !== rightWait) return rightWait - leftWait
      return right.updatedAt - left.updatedAt
    })
    .slice(0, ACTIVE_SESSION_CAP)
}
