/**
 * 会话行左侧的 Agent 品牌标：画该会话绑定的 runtime，不要一律跟 Composer 当前选择。
 */
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { pickSessionRuntime } from "@renderer/lib/session-runtime"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function SessionAgentMark({ sessionId, size = 14 }: { sessionId: string; size?: number }) {
  const t = useT()
  const sessionRuntimes = useChatStore((state) => state.sessionRuntimes)
  const preferredRuntimeId = useChatStore((state) => state.preferredRuntimeId)
  const runtimeId = pickSessionRuntime(sessionId, sessionRuntimes, preferredRuntimeId)
  const tools = useSettingsSnapshot().data?.agentTools ?? []
  const label = tools.find((tool) => tool.id === runtimeId)?.label ?? runtimeId
  return (
    <span
      className="flex size-4 shrink-0 items-center justify-center"
      title={label}
      aria-label={t("chat.sessionAgentAria", { name: label })}
    >
      <AgentBrandIcon id={runtimeId} size={size} />
    </span>
  )
}
