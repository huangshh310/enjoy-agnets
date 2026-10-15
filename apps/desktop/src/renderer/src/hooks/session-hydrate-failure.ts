/**
 * loadSession 拉历史（session.messages）失败时的收尾（leo #157）：
 * 只要这次加载仍是最新的一次（世代没被后来的加载 / 发送顶掉、调用方没判过期）、前台仍是这个会话，
 * 就打「已回灌」标记，让前台立刻退回空态，不停在加载占位等 8 秒兜底。
 * 返回原始 error 对象本身，由 loadSession 原样抛出。
 */
import { useChatStore } from "../stores/chat-store"
import { isSessionHydrateCurrent } from "./session-hydrate-generation"
import { markSessionHistoryHydrated } from "./session-history-pending"

export function settleFailedSessionHydrate<E>(
  error: E,
  input: { sessionId: string; generation: number; stale?: () => boolean }
): E {
  const current = isSessionHydrateCurrent(input.generation) && !input.stale?.()
  if (current && useChatStore.getState().sessionId === input.sessionId) {
    markSessionHistoryHydrated(input.sessionId)
  }
  return error
}
