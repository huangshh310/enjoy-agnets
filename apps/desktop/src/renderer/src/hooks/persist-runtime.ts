/**
 * 把 Composer 选中的 runtimeId 写入偏好与当前会话覆盖。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
import { patchPreferences } from "./use-settings-snapshot"

/** 只绑这一条会话，不改全局偏好。新建会话也走这里。 */
export async function bindSessionRuntime(sessionId: string, runtimeId: AgentToolId) {
  const store = useChatStore.getState()
  store.setSessionRuntimes({ ...store.sessionRuntimes, [sessionId]: runtimeId })
  if (!hasIde()) return
  await getIde().agentTools.setSessionRuntime({ sessionId, runtimeId })
}

export async function persistRuntimeId(runtimeId: AgentToolId, modelId?: string) {
  const store = useChatStore.getState()
  store.setRuntimeId(runtimeId)
  store.setPreferredRuntimeId(runtimeId)
  if (store.sessionId) await bindSessionRuntime(store.sessionId, runtimeId)
  await patchPreferences({ runtimeId })
  if (!hasIde()) return
  if (modelId) await getIde().agentTools.upsert({ id: runtimeId, modelId })
}
