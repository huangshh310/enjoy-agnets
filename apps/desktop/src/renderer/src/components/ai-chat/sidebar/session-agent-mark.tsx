/**
 * 会话行左侧的 Agent 品牌标：画该会话绑定的 runtime，不要一律跟 Composer 当前选择。
 */
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { useSessionEngineFace } from "@renderer/hooks/use-engine-display-name"
import { useT } from "@renderer/i18n"

export function SessionAgentMark({ sessionId, size = 14 }: { sessionId: string; size?: number }) {
  const t = useT()
  const { runtimeId, face, trueNameTitle } = useSessionEngineFace(sessionId)
  return (
    <span
      className="flex size-4 shrink-0 items-center justify-center"
      title={trueNameTitle}
      aria-label={t("chat.sessionAgentAria", { name: face })}
    >
      <AgentBrandIcon id={runtimeId} size={size} />
    </span>
  )
}
