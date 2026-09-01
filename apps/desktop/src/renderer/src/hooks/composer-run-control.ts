/**
 * Composer 运行控制：Stop、认领 runId、切会话时清 running。
 * agent.run 返回前 runId 为空，Stop 也必须先松 UI，不能空 return。
 */
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
import { canClaimComposerRun, isEmptyStreamingAssistant } from "./composer-run-policy"

/** IPC 返回后认领本轮；用户已 Stop 或切了会话则拒绝。 */
export function claimComposerRun(startedSessionId: string | null, runId: string): boolean {
  const store = useChatStore.getState()
  if (!canClaimComposerRun({
    running: store.running,
    sessionId: store.sessionId,
    startedSessionId
  })) {
    return false
  }
  store.setRunning(true, runId)
  return true
}

/** 主进程已经开工但 UI 已停 / 已切会话时，把那一轮 abort 掉。 */
export function abortOrphanedRun(runId: string) {
  if (!hasIde()) return
  void getIde().ai.abort(runId).catch(() => undefined)
}

/**
 * 立刻停 UI。不要等 abort IPC，也不要求已经有 runId。
 * 空的 pending 助手直接丢掉，避免留下「Thinking / No reasoning trace」。
 */
export async function abortComposerRun() {
  const store = useChatStore.getState()
  const runId = store.runId
  dropEmptyPendingAssistant()
  finalizeStreamingAssistant()
  store.setPendingApproval(null)
  store.setRunning(false)
  if (runId) abortOrphanedRun(runId)
}

/** 启动失败时丢掉还没字的乐观助手轮。 */
export function dropEmptyPendingAssistant() {
  const store = useChatStore.getState()
  if (!isEmptyStreamingAssistant(store.messages.at(-1))) return
  store.setMessages(store.messages.slice(0, -1))
}

function finalizeStreamingAssistant() {
  const store = useChatStore.getState()
  const last = store.messages.at(-1)
  if (last?.role !== "assistant" || !last.streaming) return
  store.setMessages(
    store.messages.map((message) => (message.streaming ? { ...message, streaming: false } : message))
  )
}
