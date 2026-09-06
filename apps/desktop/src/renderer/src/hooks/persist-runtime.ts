/**
 * 把 Composer 选中的 runtimeId 写入偏好与当前会话覆盖。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
import { patchPreferences } from "./use-settings-snapshot"

export async function persistRuntimeId(runtimeId: AgentToolId, modelId?: string) {
  const store = useChatStore.getState()
  store.setRuntimeId(runtimeId)
  store.setPreferredRuntimeId(runtimeId)
  const sessionId = store.sessionId
  if (sessionId) {
    store.setSessionRuntimes({ ...store.sessionRuntimes, [sessionId]: runtimeId })
  }
  await patchPreferences({ runtimeId })
  if (!hasIde()) return
  if (modelId) await getIde().agentTools.upsert({ id: runtimeId, modelId })
  if (sessionId) await getIde().agentTools.setSessionRuntime({ sessionId, runtimeId })
}
