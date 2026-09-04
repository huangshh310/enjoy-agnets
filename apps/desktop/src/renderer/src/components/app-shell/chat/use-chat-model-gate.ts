/**
 * Chat 模型切换 + 实验媒体门闩，从 ChatStage 抽出走线。
 */
import {
  applySettingsSnapshot,
  sendComposerMessage
} from "@renderer/hooks/use-agent-session"
import { useExperimentalMediaGate } from "@renderer/hooks/experimental-media-gate"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"

export function useChatModelGate() {
  const modelId = useChatStore((state) => state.modelId)
  const models = useChatStore((state) => state.models)
  const setModel = useChatStore((state) => state.setModel)

  async function handleModelChange(model: ModelOption) {
    setModel(model.id, model.label, model.provider, model.reasoningEffort)
    if (!hasIde()) return
    try {
      const snapshot = (await getIde().settings.setActiveModel({
        providerId: model.providerId,
        modelId: model.id
      })) as SettingsSnapshot
      await applySettingsSnapshot(snapshot)
    } catch {
      // 激活失败不打断当前会话
    }
  }

  return useExperimentalMediaGate({
    modelId,
    models,
    onSend: () => void sendComposerMessage(),
    onModelChange: (model) => void handleModelChange(model)
  })
}
