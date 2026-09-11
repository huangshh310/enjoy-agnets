/**
 * Grok 记录的费用。只作行内数字，不做成与合计并排的账单卡。
 */
import { useT } from "@renderer/i18n"
import { formatGrokUsd } from "../lib/format"

export function CliUsageGrokCost({ ticks }: { ticks: number }) {
  const t = useT()
  const label = formatGrokUsd(ticks)
  if (!label) return null
  return (
    <span
      className="font-mono text-caption-1-medium tabular-nums text-text-secondary"
      title={t("pages.observability.cliUsageGrokCostHint")}
    >
      {label}
    </span>
  )
}
