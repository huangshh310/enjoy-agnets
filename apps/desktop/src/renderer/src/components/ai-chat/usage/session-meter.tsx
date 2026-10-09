/**
 * L3 本轮上下文用量：有真实 token 才显示，无用量隐藏。
 */
import { formatTokens } from "../agent-limits/format-tokens"
import { useContextInspectorData } from "../right-pane/views/context/use-context-inspector-data"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function SessionMeter() {
  const t = useT()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const running = useChatStore((state) => state.running)
  const stats = useContextInspectorData(workspaceId).tokenStats
  if (stats.usedTokens <= 0 && !running) return null

  const percent = stats.maxTokens > 0 ? Math.round(stats.usagePercent) : null
  const titleHint =
    percent != null
      ? `${t("chat.usage.sessionMeterHint")} (${percent}%)`
      : t("chat.usage.sessionMeterHint")

  return (
    <span
      className="hidden shrink-0 items-center gap-1 font-mono text-caption-2-medium tabular-nums text-text-tertiary select-none @[36rem]:inline-flex"
      title={titleHint}
    >
      <span>
        {formatTokens(stats.usedTokens)} {t("chat.tokenUnit")}
      </span>
    </span>
  )
}
