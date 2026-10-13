/**
 * 助手泡底脚：本轮 stamp 的引擎 · 模型。换模后不改写旧泡。
 */
import { rememberedAgentTool } from "@renderer/hooks/agent-tools-cache"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { formatHistoryModelLabel } from "@renderer/lib/model-switch-state"
import { useChatStore, type ThreadMessage } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function TurnModelLabel({ message }: { message: ThreadMessage }) {
  const t = useT()
  const catalog = useChatStore((state) => state.models)
  const snapshot = useSettingsSnapshot()
  const tools = snapshot.data?.agentTools ?? []
  // Enjoy 本地的工具名来自主进程（中文），按界面语言走 i18n（luna P3）。
  const engine =
    message.runtimeId === "enjoy-local"
      ? t("chat.usage.enjoyLocal")
      : message.runtimeId
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
