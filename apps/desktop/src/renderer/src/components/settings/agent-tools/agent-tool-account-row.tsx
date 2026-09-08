/**
 * 卡片账号摘要：L1 条仅 quota=true 且有官方数字；否则诚实空态，不画空条。
 */
import { RiUser3Line } from "@remixicon/react"
import { capabilitiesOf, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { HonestQuotaEmpty } from "./honest-quota-empty"
import { barWidth, formatQuotaPercent, pickQuotaPercent, pickQuotaWindow } from "./agent-tool-quota"

export function AgentToolAccountRow({
  tool,
  loading
}: {
  tool: AgentToolPublic
  loading: boolean
}) {
  const t = useT()
  if (!tool.authAccount && !loading) return null
  const canQuota = capabilitiesOf(tool).quota
  const percent = pickQuotaPercent(tool.quotaInfo, tool.selectedModel)
  const windowLabel = pickQuotaWindow(tool.quotaInfo, tool.selectedModel)
  return (
    <div className="flex flex-col gap-1.5 border-t border-separator-border/40 pt-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-caption-2-medium text-text-secondary">
          <RiUser3Line className="size-3 shrink-0 text-text-tertiary" />
          <span className="truncate font-medium" title={tool.authAccount?.email || tool.authAccount?.accountName}>
            {tool.authAccount?.email ||
              tool.authAccount?.accountName ||
              (loading ? t("settings.agentTools.accountLoading") : t("settings.agentTools.accountUnknown"))}
          </span>
          {tool.authAccount?.tier ? (
            <span className="shrink-0 rounded bg-accent-500/10 px-1 font-mono text-caption-2-medium text-accent-600">
              {tool.authAccount.tier}
            </span>
          ) : null}
        </div>
        {canQuota && windowLabel ? (
          <span className="min-w-0 truncate font-mono text-caption-2-medium text-text-tertiary" title={windowLabel}>
            {windowLabel}
          </span>
        ) : null}
      </div>
      {loading && canQuota ? <QuotaSkeleton /> : null}
      {!loading && canQuota && percent != null ? <QuotaBar percent={percent} /> : null}
      {!loading && canQuota && percent == null ? <HonestQuotaEmpty reason="no-data" /> : null}
      {!loading && !canQuota ? <HonestQuotaEmpty reason="no-api" /> : null}
    </div>
  )
}

function QuotaBar({ percent }: { percent: number }) {
  const tone = percent >= 85 ? "bg-rose-500" : percent >= 50 ? "bg-amber-500" : "bg-accent-500"
  return (
    <div className="flex items-center gap-2 pt-0.5">
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-background-secondary-hover/70">
        <div className={cx("h-full rounded-full transition-all duration-300", tone)} style={{ width: `${barWidth(percent)}%` }} />
      </div>
      <span className="w-11 shrink-0 text-right font-mono text-caption-2-medium tabular-nums text-text-primary">
        {formatQuotaPercent(percent)}
      </span>
    </div>
  )
}

function QuotaSkeleton() {
  return <div className="h-1.5 w-full animate-pulse rounded-full bg-background-secondary-hover" aria-hidden />
}
