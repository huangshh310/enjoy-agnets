/**
 * Chat 模型切换 + 实验媒体门闩，从 ChatStage 抽出走线。
 * 同引擎换模走会话覆盖，不把中途模型写成全局档案默认。
 */
import { requestModelSwitch } from "@renderer/components/ai-chat/agent-picker/request-model-switch"
import { submitComposer } from "@renderer/hooks/use-agent-session"
import { useExperimentalMediaGate } from "@renderer/hooks/experimental-media-gate"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"

export function useChatModelGate() {
  const modelId = useChatStore((state) => state.modelId)
  const models = useChatStore((state) => state.models)

  async function handleModelChange(model: ModelOption) {
    await requestModelSwitch(model.id)
  }

  return useExperimentalMediaGate({
    modelId,
    models,
    onSend: () => void submitComposer("send"),
    onModelChange: (model) => void handleModelChange(model)
  })
}
