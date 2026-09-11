/**
 * 本机记录脉冲行：合计与会话同一套栅格，数字基线对齐。
 */
import type { CliUsageBucket } from "@enjoy-agents/ipc-contract"
import { formatTokens } from "@renderer/components/ai-chat/agent-limits/format-tokens"
import { useT } from "@renderer/i18n"
import { hasTokenBreakdown } from "../lib/format"

export function CliUsagePulseStrip(props: { totals: CliUsageBucket; mixed: boolean }) {
  const t = useT()
  const split = !props.mixed && hasTokenBreakdown(props.totals)
  const hint = split
    ? t("pages.observability.cliUsageSplitLine", {
        input: formatTokens(props.totals.inputTokens),
        output: formatTokens(props.totals.outputTokens),
        cache: formatTokens(props.totals.cacheTokens)
      })
    : t("pages.observability.cliUsageNoSplit")
  return (
    <div className="grid w-fit grid-cols-2 gap-x-10 gap-y-0.5">
      <p className="text-caption-2-medium text-text-tertiary">{t("pages.observability.cliUsageTotal")}</p>
      <p className="text-caption-2-medium text-text-tertiary">{t("pages.observability.cliUsageSessions")}</p>
      <p className="font-mono text-title-2-semibold tabular-nums text-text-primary">
        {formatTokens(props.totals.totalTokens)}
      </p>
      <p className="font-mono text-title-2-semibold tabular-nums text-text-primary">{props.totals.sessions}</p>
      <p className="font-mono text-caption-2-medium text-text-tertiary">{hint}</p>
      <p className="font-mono text-caption-2-medium text-text-tertiary">{"\u00a0"}</p>
    </div>
  )
}
