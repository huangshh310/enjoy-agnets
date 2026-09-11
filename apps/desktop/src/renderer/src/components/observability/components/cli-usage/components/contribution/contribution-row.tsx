/**
 * 单条 CLI 贡献：品牌、token、占比条、会话；Grok 费用挂在这一行。
 */
import type { CliUsageSource, CliUsageSourceId } from "@enjoy-agents/ipc-contract"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { formatTokens } from "@renderer/components/ai-chat/agent-limits/format-tokens"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { hasTokenBreakdown } from "../../lib/format"
import { sourceNameKey } from "../../lib/source-chip-copy"
import { CliUsageGrokCost } from "../grok-cost"

export function CliUsageContributionRow(props: {
  source: CliUsageSource
  share: number | undefined
  selected: boolean
  onToggle: (id: CliUsageSourceId) => void
}) {
  const t = useT()
  const { source, share } = props
  const name = t(sourceNameKey(source.id))
  return (
    <li>
      <button
        type="button"
        aria-pressed={props.selected}
        onClick={() => props.onToggle(source.id)}
        className={cx(
          "flex w-full flex-col gap-1.5 px-3.5 py-2.5 text-left transition-colors duration-200",
          "hover:bg-background-secondary-hover/40 active:scale-[0.98]",
          props.selected && "bg-accent-500/10"
        )}
      >
        <div className="flex items-center gap-2.5">
          <AgentBrandIcon id={source.id} size={18} />
          <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">{name}</span>
          <span className="w-16 shrink-0 text-right">
            {source.costUsdTicks ? <CliUsageGrokCost ticks={source.costUsdTicks} /> : null}
          </span>
          <span className="w-[4.75rem] shrink-0 text-right font-mono text-caption-1-medium tabular-nums text-text-primary">
            {formatTokens(source.totalTokens)}
          </span>
          <span className="w-10 shrink-0 text-right font-mono text-caption-2-medium tabular-nums text-text-tertiary">
            {share === undefined ? "—" : t("pages.observability.cliUsageShareOf", { n: share })}
          </span>
        </div>
        <ShareTrack share={share} />
        <p className="font-mono text-caption-2-medium text-text-tertiary">{rowHint(source, t)}</p>
      </button>
    </li>
  )
}

function ShareTrack({ share }: { share: number | undefined }) {
  const width = share && share > 0 ? share : 0
  return (
    <div className="h-1 overflow-hidden rounded-full bg-background-tertiary-default">
      <div className="h-full rounded-full bg-accent-500" style={{ width: `${width}%` }} />
    </div>
  )
}

function rowHint(source: CliUsageSource, t: (path: string, vars?: Record<string, string | number>) => string): string {
  const sessions = t("pages.observability.cliUsageSessionCount", { n: source.sessionCount })
  if (!hasTokenBreakdown(source)) {
    return `${sessions} · ${t("pages.observability.cliUsageNoSplit")}`
  }
  return `${sessions} · ${t("pages.observability.cliUsageSplitLine", {
    input: formatTokens(source.inputTokens),
    output: formatTokens(source.outputTokens),
    cache: formatTokens(source.cacheTokens)
  })}`
}
