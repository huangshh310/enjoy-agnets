/**
 * luna P3：离开一个空的「新对话」（没有消息、没在跑、输入框没字、没附加物、不在建会话/首发中）就删掉它。
 * main 侧 onlyIfEmpty 再兜一次：有落库消息 / run / 草稿 / 心跳 / 标记 / 目标 / run 正在启动都不删。
 */
import { getIde, hasIde } from "../lib/ide"

export type LeaveState = {
  sessionId: string | null
  messages: ReadonlyArray<unknown>
  running: boolean
  runId?: string | null
  composer: string
  /** leo BLOCK ④(a)：附件 / 引用 / 知识 Chip / 技能。 */
  hasExtras?: boolean
  /** leo BLOCK ④(b)：建会话 / 首发准备中。 */
  preparingHint?: boolean
  preparingSessionId?: string | null
  createPending?: boolean
  queuedSend?: boolean
}

export function emptySessionToDiscardOnLeave(state: LeaveState, nextSessionId: string | null): string | null {
  const id = state.sessionId
  if (!id || id === nextSessionId) return null
  if (state.messages.length > 0 || state.running || state.runId) return null
  if (state.composer.trim()) return null
  if (state.hasExtras) return null
  if (state.createPending || state.queuedSend) return null
  if (state.preparingHint && (state.preparingSessionId === null || state.preparingSessionId === id)) return null
  return id
}

export function discardEmptySessionOnLeave(state: LeaveState, nextSessionId: string | null): void {
  const id = emptySessionToDiscardOnLeave(state, nextSessionId)
  if (!id || !hasIde()) return
  void Promise.resolve(getIde().session.delete({ sessionId: id, onlyIfEmpty: true })).catch((error: unknown) => {
    console.warn("[session] 离开时删除空会话失败", id, error)
  })
}
