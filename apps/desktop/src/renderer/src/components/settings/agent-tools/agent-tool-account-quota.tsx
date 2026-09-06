/**
 * 配置弹窗里的模型额度网格。数字只来自官方已用百分比。
 */
import { RiArrowDownSLine, RiTimeLine } from "@remixicon/react"
import type { ModelQuotaItem } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { barWidth, formatQuotaPercent } from "./agent-tool-quota"

export function AgentToolQuotaGrid({
  pinned,
  rest,
  showAll,
  onToggle
}: {
  pinned: ModelQuotaItem[]
  rest: ModelQuotaItem[]
  showAll: boolean
  onToggle: () => void
}) {
  const t = useT()
  return (
    <div className="space-y-2.5 rounded-xl border border-border-button-default bg-background-primary-default p-3">
      <div className="flex items-center justify-between text-caption-2-medium text-text-tertiary">
        <span className="flex items-center gap-1.5 text-caption-1-medium text-text-primary">
          <RiTimeLine className="size-3.5 text-accent-500" />
          {t("settings.agentTools.quotaModels")}
        </span>
        <span className="font-mono">{t("settings.agentTools.quotaCount", { count: pinned.length + rest.length })}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {pinned.map((item) => (
          <QuotaCard key={item.name} item={item} />
        ))}
      </div>
      {rest.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-between rounded-lg border border-dashed border-border-button-default px-2.5 py-1 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover/40 hover:text-text-primary"
          >
            <span>
              {showAll
                ? t("settings.agentTools.quotaCollapse")
                : t("settings.agentTools.quotaExpand", { count: rest.length })}
            </span>
            <RiArrowDownSLine className={`size-3 transition-transform ${showAll ? "rotate-180" : ""}`} />
          </button>
          {showAll ? (
            <div className="mt-2 max-h-44 space-y-2 overflow-y-auto border-t border-separator-border/40 pt-2">
              {rest.map((item) => (
                <QuotaCard key={item.name} item={item} compact />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function QuotaCard({ item, compact }: { item: ModelQuotaItem; compact?: boolean }) {
  const t = useT()
  const bar = item.percentage > 75 ? "bg-text-error-primary" : item.percentage > 40 ? "bg-text-secondary" : "bg-accent-500"
  return (
    <div className="space-y-1.5 rounded-lg border border-border-button-default/70 bg-background-secondary-default/30 p-2.5">
      <span className="block truncate text-caption-2-medium text-text-primary" title={item.displayName}>
        {item.displayName}
      </span>
      <div className="flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-background-secondary-hover">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${barWidth(item.percentage)}%` }} />
        </div>
        <span className="w-10 shrink-0 text-right font-mono text-caption-2-medium tabular-nums text-text-secondary">
          {formatQuotaPercent(item.percentage)}
        </span>
      </div>
      {!compact ? (
        <p className="font-mono text-caption-2-medium text-text-tertiary">
          {item.resetsIn ? item.resetsIn : t("settings.agentTools.quotaReady")}
        </p>
      ) : null}
    </div>
  )
}
