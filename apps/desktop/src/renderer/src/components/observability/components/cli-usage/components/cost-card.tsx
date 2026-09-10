/**
 * Grok 记录的费用卡。不是 Enjoy 账单，ticks 缺省不渲染。
 */
import { RiMoneyDollarCircleLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { formatGrokUsd } from "../lib/format"

export function CliUsageGrokCostCard({ ticks }: { ticks: number }) {
  const t = useT()
  const label = formatGrokUsd(ticks)
  if (!label) return null
  return (
    <div className="flex h-full min-w-0 flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3 shadow-2xs">
      <div className="flex items-center justify-between text-text-tertiary">
        <span className="text-caption-2-medium">{t("pages.observability.cliUsageGrokCost")}</span>
        <RiMoneyDollarCircleLine className="size-3.5 text-accent-500" />
      </div>
      <p className="mt-2 font-mono text-title-3-semibold tabular-nums text-text-primary">{label}</p>
      <p className="mt-1 font-mono text-caption-2-medium text-text-tertiary">
        {t("pages.observability.cliUsageGrokCostHint")}
      </p>
    </div>
  )
}
