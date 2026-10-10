/**
 * 打开工作区时选前台会话。刚创建、名单还没跟上时不要退回 sessions[0]。
 */

export type ForegroundSessionPick<T extends { id: string }> = T | "keep" | "create"

export function pickForegroundSession<T extends { id: string }>(
  sessions: T[],
  currentId: string | null
): ForegroundSessionPick<T> {
  if (currentId) {
    return sessions.find((session) => session.id === currentId) ?? "keep"
  }
  return sessions[0] ?? "create"
}
