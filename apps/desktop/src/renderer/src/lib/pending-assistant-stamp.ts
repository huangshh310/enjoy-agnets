/**
 * 乐观助手泡打上本轮引擎/模型，换模后旧泡不改写。
 */
import { resolveModelDisplayName } from "./model-display-name.ts"
import { getEffectiveModel } from "./session-model.ts"

export function pendingAssistantStamp(store: {
  runtimeId: string
  modelId: string
  modelLabel: string
  sessionId: string | null
  sessionModels: Record<string, string>
}): { runtimeId?: string; modelId?: string; modelLabel?: string } {
  const modelId = getEffectiveModel({
    sessionId: store.sessionId,
    sessionModels: store.sessionModels,
    engineDefault: store.modelId
  })
  return {
    runtimeId: store.runtimeId || undefined,
    modelId: modelId || undefined,
    modelLabel: modelId ? resolveModelDisplayName(modelId, store.modelLabel) : undefined
  }
}
