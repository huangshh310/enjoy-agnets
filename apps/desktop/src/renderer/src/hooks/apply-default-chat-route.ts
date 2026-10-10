/**
 * 新对话默认路线只消费 main 快照，不在渲染进程猜 hasKey。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { useChatStore } from "../stores/chat-store"

export function applyDefaultChatRoute(snapshot: ChatReadiness): void {
  const route = snapshot.defaultRoute
  if (!route) return
  const store = useChatStore.getState()
  store.setPreferredRuntimeId(route.runtimeId)
  if (route.modelId) store.setPreferredModelId(route.modelId)
  const bound = store.sessionId ? store.sessionRuntimes[store.sessionId] : undefined
  if (bound) return
  store.setRuntimeId(route.runtimeId)
  if (route.modelId && !store.modelId) store.setModel(route.modelId, store.modelLabel)
}
