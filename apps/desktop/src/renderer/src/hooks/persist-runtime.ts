/**
 * 把 Composer 选中的 runtimeId 写入偏好与当前会话覆盖。
 * 中途换模走 persistSessionModel，禁止误写成全局 upsert。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { sessionHasUserTurns } from "../components/ai-chat/agent-picker/handoff/plan-composer-switch.ts"
import { getIde, hasIde } from "../lib/ide"
import { nextPreferredModelId, planSessionModelWrite } from "../lib/session-model.ts"
import { useChatStore } from "../stores/chat-store"
import { patchPreferences } from "./use-settings-snapshot"

/** 只绑这一条会话，不改全局偏好。新建会话也走这里。 */
export async function bindSessionRuntime(sessionId: string, runtimeId: AgentToolId) {
  const store = useChatStore.getState()
  store.setSessionRuntimes({ ...store.sessionRuntimes, [sessionId]: runtimeId })
  if (!hasIde()) return
  await getIde().agentTools.setSessionRuntime({
    sessionId,
    runtimeId,
    modelId: store.sessionModels[sessionId]
  })
}

/** 只写 sessionModels[sessionId]；空会话才可同时写偏好默认。 */
export async function persistSessionModel(modelId: string) {
  const store = useChatStore.getState()
  const next = modelId.trim()
  if (!next) return
  const sessionId = store.sessionId
  const plan = planSessionModelWrite({ hasUserTurns: sessionHasUserTurns(store.messages) })
  const catalog = store.models.find((item) => item.id === next)
  store.setModel(next, catalog?.label ?? store.modelLabel, catalog?.provider, catalog?.reasoningEffort)
  store.setPreferredModelId(
    nextPreferredModelId({
      writePreferenceDefault: plan.writePreferenceDefault,
      nextModelId: next,
      previousPreferred: store.preferredModelId
    })
  )
  if (sessionId) {
    store.setSessionModels({ ...store.sessionModels, [sessionId]: next })
  }
  if (!hasIde()) return
  if (sessionId) {
    await getIde().agentTools.setSessionRuntime({
      sessionId,
      runtimeId: store.runtimeId as AgentToolId,
      modelId: next
    })
  }
  if (!plan.writePreferenceDefault) return
  if (store.runtimeId === "enjoy-local") {
    await getIde().settings.setActiveModel({ modelId: next })
    return
  }
  await getIde().agentTools.upsert({ id: store.runtimeId as AgentToolId, modelId: next })
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
