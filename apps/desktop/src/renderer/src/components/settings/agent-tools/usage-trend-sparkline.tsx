/**
 * OpenUsage 式迷你 30 天柱：跟「Usage Trend」同一行，不要占半张卡。
 */
import { useMemo, useState } from "react"
import type { ProviderSpendStats } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { formatTokens } from "./format-spend"

export function UsageTrendSparkline({ spend }: { spend: ProviderSpendStats }) {
  const t = useT()
  const [hover, setHover] = useState<number | null>(null)
  const trend = spend.trend30Days ?? []
  const maxTokens = useMemo(() => Math.max(1, ...trend.map((point) => point.tokens)), [trend])
  if (trend.length === 0) return null
  const active = hover != null ? trend[hover] : null

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="shrink-0 text-caption-1-medium text-text-primary">{t("settings.subscriptions.trend")}</span>
      <div className="flex h-6 min-w-0 flex-1 items-end gap-px">
        {trend.map((point, index) => (
          <button
            key={point.day}
            type="button"
            className="relative h-full min-w-0 flex-1"
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              className="absolute inset-x-0 bottom-0 rounded-sm bg-accent-500"
              style={{
                height: `${point.tokens <= 0 ? 6 : Math.round((point.tokens / maxTokens) * 100)}%`,
                opacity: hover != null && hover !== index ? 0.35 : point.tokens <= 0 ? 0.2 : 1
              }}
            />
          </button>
        ))}
      </div>
      <span className="shrink-0 tabular-nums text-caption-2-medium text-text-tertiary">
        {active ? `${active.day.slice(5)} · ${formatTokens(active.tokens)}` : formatTokens(spend.last30Days?.tokens ?? 0)}
      </span>
    </div>
  )
}
