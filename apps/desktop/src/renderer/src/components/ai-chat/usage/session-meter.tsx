/**
 * L3 本轮上下文用量：有实测用实测，没有才估算；无用量隐藏。
 * COST-P3：可见铬仍只 tok；悬停接 session.estimatedCost。
 */
import { useQuery } from "@tanstack/react-query"
import { SessionEstimatedCost } from "@enjoy-agents/ipc-contract/estimated-cost"
import { formatTokens } from "../agent-limits/format-tokens"
import { useContextInspectorData } from "../right-pane/views/context/use-context-inspector-data"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { formatSessionCostHover } from "./format-estimated-cost"

export function SessionMeter() {
  const t = useT()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const sessionId = useChatStore((state) => state.sessionId)
  const running = useChatStore((state) => state.running)
  const stats = useContextInspectorData(workspaceId).tokenStats
  const costQuery = useQuery({
    queryKey: ["session-estimated-cost", sessionId, running],
    enabled: hasIde() && Boolean(sessionId),
    queryFn: async () => {
      const parsed = SessionEstimatedCost.safeParse(
        await getIde().session.estimatedCost({ sessionId })
      )
      return parsed.success ? parsed.data : null
    }
  })
  if (stats.usedTokens <= 0 && !running) return null

  const percent = stats.maxTokens > 0 ? Math.round(stats.usagePercent) : null
  const usageHint =
    percent != null
      ? `${t("chat.usage.sessionMeterHint")} (${percent}%)`
      : t("chat.usage.sessionMeterHint")
  const costHover = formatSessionCostHover(costQuery.data, t)
  const titleHint = costHover && costHover !== t("chat.usage.sessionMeterHint")
    ? `${usageHint}\n${costHover}`
    : usageHint

  return (
    <span
      className="hidden shrink-0 items-center gap-1 font-mono text-caption-2-medium tabular-nums text-text-secondary select-none @[36rem]:inline-flex"
      title={titleHint}
      data-testid="session-meter"
    >
      <span>{formatTokens(stats.usedTokens)}</span>
    </span>
  )
}
