/**
 * 在途 desktop_act 取消范围：归档 A 不得掐掉 B 的 act。
 */
export type DesktopActOwner = {
  sessionId?: string
  runId?: string
}

export function shouldCancelInFlightDesktopAct(
  owner: DesktopActOwner | null,
  scope?: DesktopActOwner
): boolean {
  if (!scope?.sessionId && !scope?.runId) return true
  if (!owner) return true
  if (scope.runId && owner.runId && scope.runId !== owner.runId) return false
  if (scope.sessionId && owner.sessionId && scope.sessionId !== owner.sessionId) return false
  return true
}
