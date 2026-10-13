/**
 * luna P3：离开一个空的「新对话」（没有消息、没在跑、输入框没字）就删掉它，不在侧栏留空壳。
 * main 侧 onlyIfEmpty 再兜一次：有落库消息 / 有 run / 有草稿都不删。
 */
import { getIde, hasIde } from "../lib/ide"

export type LeaveState = {
  sessionId: string | null
  messages: ReadonlyArray<unknown>
  running: boolean
  runId?: string | null
  composer: string
}

export function emptySessionToDiscardOnLeave(state: LeaveState, nextSessionId: string | null): string | null {
  const id = state.sessionId
  if (!id || id === nextSessionId) return null
  if (state.messages.length > 0 || state.running || state.runId) return null
  if (state.composer.trim()) return null
  return id
}

export function discardEmptySessionOnLeave(state: LeaveState, nextSessionId: string | null): void {
  const id = emptySessionToDiscardOnLeave(state, nextSessionId)
  if (!id || !hasIde()) return
  void Promise.resolve(getIde().session.delete({ sessionId: id, onlyIfEmpty: true })).catch(() => undefined)
}
