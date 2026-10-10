/**
 * 新对话默认路线只消费 main 快照。本会话 Picker 选择优先，不打回去。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { useChatStore } from "../stores/chat-store"

export function applyDefaultChatRoute(snapshot: ChatReadiness): void {
  const route = snapshot.defaultRoute
  if (!route) return
  const store = useChatStore.getState()
  const prevPreferred = store.preferredRuntimeId
  const bound = store.sessionId ? store.sessionRuntimes[store.sessionId] : undefined
  store.setPreferredRuntimeId(route.runtimeId)
  if (route.modelId) store.setPreferredModelId(route.modelId)
  if (bound) return
  if (store.runtimeId === route.runtimeId) {
    if (route.modelId && !store.modelId) store.setModel(route.modelId, store.modelLabel)
    return
  }
  const stillFactory = store.runtimeId === "enjoy-local" && prevPreferred === "enjoy-local"
  if (!stillFactory) return
  store.setRuntimeId(route.runtimeId)
  if (route.modelId && !store.modelId) store.setModel(route.modelId, store.modelLabel)
}
