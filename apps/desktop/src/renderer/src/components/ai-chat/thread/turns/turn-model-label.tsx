/**
 * 助手泡底脚：本轮 stamp 的引擎 · 模型。换模后不改写旧泡。
 */
import { rememberedAgentTool } from "@renderer/hooks/agent-tools-cache"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { turnModelText } from "@renderer/lib/turn-model-text"
import { useChatStore, type ThreadMessage } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function TurnModelLabel({ message }: { message: ThreadMessage }) {
  const t = useT()
  const catalog = useChatStore((state) => state.models)
  const snapshot = useSettingsSnapshot()
  const tools = snapshot.data?.agentTools ?? []
  // Enjoy 本地的工具名来自主进程（中文），按界面语言走 i18n（luna P3）。`cli:` 占位不当模型名。
  const text = turnModelText({
    runtimeId: message.runtimeId,
    modelId: message.modelId,
    modelLabel: message.modelLabel,
    enjoyLocalLabel: t("chat.usage.enjoyLocal"),
    catalog,
    tools,
    rememberedToolLabel: (id) => rememberedAgentTool(id)?.label
  })
  if (!text) return null
  return <p className="mt-1 text-caption-2-regular text-text-tertiary">{text}</p>
}
