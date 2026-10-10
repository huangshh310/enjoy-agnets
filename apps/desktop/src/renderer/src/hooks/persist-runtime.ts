/**
 * Composer 选中的 runtime 只绑当前会话；设为主引擎才写偏好。
 * 中途换模走 persistSessionModel，禁止误写成全局 upsert。
 */
import { capabilitiesFor, type AgentToolId } from "@enjoy-agents/ipc-contract"
import { sessionHasUserTurns } from "../components/ai-chat/agent-picker/handoff/plan-composer-switch.ts"
import { getIde, hasIde } from "../lib/ide"
import { supportsMidSessionModelSwitch } from "../lib/model-switch-state.ts"
import { nextPreferredModelId, planSessionModelWrite } from "../lib/session-model.ts"
import { useChatStore } from "../stores/chat-store"
import { runSecretWrite, SecretWriteUiError } from "../lib/secret-write"
import { applyPreferredRuntime, persistPreferredAfterSecret } from "./persist-preferred-runtime.ts"
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
  if (!supportsMidSessionModelSwitch(capabilitiesFor(store.runtimeId).models)) {
    throw new Error("MODEL_SWITCH_UNSUPPORTED")
  }
  const sessionId = store.sessionId
  const plan = planSessionModelWrite({ hasUserTurns: sessionHasUserTurns(store.messages) })
  const catalog = store.models.find((item) => item.id === next)
  const previous = {
    modelId: store.modelId,
    modelLabel: store.modelLabel,
    preferredModelId: store.preferredModelId,
    sessionModels: store.sessionModels,
    reasoningEffort: store.reasoningEffort
  }
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
  try {
    await persistSessionModelRemote(store.runtimeId as AgentToolId, sessionId, next, plan.writePreferenceDefault)
  } catch (error) {
    restoreSessionModel(previous)
    throw error
  }
}

async function persistSessionModelRemote(
  runtimeId: AgentToolId,
  sessionId: string | null,
  next: string,
  writePreferenceDefault: boolean
) {
  if (!hasIde()) return
  if (sessionId) {
    await getIde().agentTools.setSessionRuntime({ sessionId, runtimeId, modelId: next })
  }
  if (!writePreferenceDefault) return
  if (runtimeId === "enjoy-local") {
    await requireSecretWrite(() => getIde().settings.setActiveModel({ modelId: next }))
    return
  }
  await requireSecretWrite(() => getIde().agentTools.upsert({ id: runtimeId, modelId: next }))
}

async function requireSecretWrite(op: () => Promise<unknown>): Promise<void> {
  const outcome = await runSecretWrite(op)
  if (!outcome.ok) throw new SecretWriteUiError(outcome.code)
}

function restoreSessionModel(previous: {
  modelId: string
  modelLabel: string
  preferredModelId: string
  sessionModels: Record<string, string>
  reasoningEffort: ReturnType<typeof useChatStore.getState>["reasoningEffort"]
}) {
  const store = useChatStore.getState()
  store.setModel(previous.modelId, previous.modelLabel, undefined, previous.reasoningEffort)
  store.setPreferredModelId(previous.preferredModelId)
  store.setSessionModels(previous.sessionModels)
}

export async function persistRuntimeId(
  runtimeId: AgentToolId,
  modelId?: string,
  opts?: { asDefault?: boolean }
) {
  const store = useChatStore.getState()
  store.setRuntimeId(runtimeId)
  if (store.sessionId) await bindSessionRuntime(store.sessionId, runtimeId)
  const writeSecret =
    hasIde() && modelId
      ? () => requireSecretWrite(() => getIde().agentTools.upsert({ id: runtimeId, modelId }))
      : undefined
  if (opts?.asDefault) {
    await persistPreferredAfterSecret({
      writeSecret,
      applyPreferred: () => applyPreferredRuntime(store, runtimeId),
      writePreferences: () => patchPreferences({ runtimeId })
    })
    return
  }
  if (writeSecret) await writeSecret()
}
