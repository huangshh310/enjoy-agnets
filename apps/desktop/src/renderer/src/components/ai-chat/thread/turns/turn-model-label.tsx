/**
 * 助手泡底脚：本轮 stamp 的引擎 · 模型。换模后不改写旧泡。
 */
import { rememberedAgentTool } from "@renderer/hooks/agent-tools-cache"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { formatHistoryModelLabel } from "@renderer/lib/model-switch-state"
import { useChatStore, type ThreadMessage } from "@renderer/stores/chat-store"

export function TurnModelLabel({ message }: { message: ThreadMessage }) {
  const catalog = useChatStore((state) => state.models)
  const snapshot = useSettingsSnapshot()
  const tools = snapshot.data?.agentTools ?? []
  const engine =
    message.runtimeId
      ? (tools.find((tool) => tool.id === message.runtimeId)?.label ??
        rememberedAgentTool(message.runtimeId)?.label ??
        message.runtimeId)
      : undefined
  const model =
    message.modelLabel?.trim() ||
    (message.modelId
      ? (catalog.find((item) => item.id === message.modelId)?.label ??
        tools
          .find((tool) => tool.id === message.runtimeId)
          ?.models.find((item) => item.id === message.modelId)?.label ??
        message.modelId)
      : undefined)
  const text = formatHistoryModelLabel({ engineLabel: engine, modelLabel: model })
  if (!text) return null
  return <p className="mt-1 text-caption-2-regular text-text-tertiary">{text}</p>
}
