/**
 * ACP 导入成功后把导入的会话切到前台。导入的会话以空线程展示，不走 loadSession 回灌，
 * 所以要在 setSession 之后自己打「已回灌」，否则会停在加载占位、等 8 秒兜底（leo #157）。
 */
import { markSessionHistoryHydrated } from "../../../hooks/session-history-pending"
import { useChatStore } from "../../../stores/chat-store"

export function openImportedAcpSession(created: { id: string; title: string }, runtimeId: string): void {
  const store = useChatStore.getState()
  store.setSession(created.id, created.title)
  store.setRuntimeId(runtimeId)
  store.setSessionRuntimes({ ...store.sessionRuntimes, [created.id]: runtimeId })
  store.setMessages([])
  markSessionHistoryHydrated(created.id)
}
