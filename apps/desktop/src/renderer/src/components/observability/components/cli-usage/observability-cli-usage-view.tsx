/**
 * 本机 CLI transcript 用量。只画聚合数字，不画额度条。
 */
import { useMemo, useState } from "react"
import type { CliTranscriptUsage, CliUsageSourceId } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { CliUsageBucketSection } from "./components/buckets/bucket-section"
import { CliUsageContributionList } from "./components/contribution/contribution-list"
import { CliUsageIdleSources } from "./components/contribution/source-idle"
import { CliUsagePulseStrip } from "./components/pulse-strip"
import {
  filterBuckets,
  rankContributions,
  resolveTotals,
  toggleSourceFilter,
  visibleHasUsage
} from "./lib/filter"
import { hasMixedBreakdown } from "./lib/format"

export function ObservabilityCliUsageView({ usage }: { usage: CliTranscriptUsage | undefined }) {
  const t = useT()
  const [selectedId, setSelectedId] = useState<CliUsageSourceId | null>(null)
  const selected = useMemo(() => effectiveSelected(usage, selectedId), [usage, selectedId])
  const derived = useMemo(() => deriveView(usage, selected), [usage, selected])

  if (!usage) return null
  if (!derived) {
    const scannedEmpty = usage.sources.some((item) => item.status === "scanned-empty")
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <div className="flex min-h-0 items-center justify-center rounded-xl border border-dashed border-separator-border/80 bg-background-secondary-default/20 px-6 py-10">
          <p className="max-w-md text-center text-caption-1-medium text-text-tertiary">
            {scannedEmpty
              ? t("pages.observability.cliUsageNoTokens")
              : t("pages.observability.cliUsageEmpty")}
          </p>
        </div>
        <CliUsageIdleSources sources={usage.sources} />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <CliUsagePulseStrip totals={derived.totals} mixed={derived.mixed} />
      <CliUsageContributionList
        items={derived.contributions}
        selectedId={selected}
        onToggle={(id) => setSelectedId(toggleSourceFilter(selected, id))}
        onClear={() => setSelectedId(null)}
      />
      <CliUsageIdleSources sources={usage.sources} />
      <CliUsageBucketSection
        days={derived.days}
        models={derived.models}
        projects={derived.projects}
        filtered={Boolean(selected)}
      />
    </div>
  )
}

function effectiveSelected(
  usage: CliTranscriptUsage | undefined,
  selectedId: CliUsageSourceId | null
): CliUsageSourceId | null {
  if (!usage || !selectedId) return null
  return usage.sources.some((item) => item.id === selectedId && item.status === "has-usage")
    ? selectedId
    : null
}

function deriveView(usage: CliTranscriptUsage | undefined, selected: CliUsageSourceId | null) {
  if (!usage) return null
  const active = visibleHasUsage(usage.sources, null)
  if (active.length === 0) return null
  const visible = visibleHasUsage(usage.sources, selected)
  return {
    totals: resolveTotals(usage.sources, usage.days, selected),
    mixed: hasMixedBreakdown(visible),
    contributions: rankContributions(usage.sources),
    days: filterBuckets(usage.days, selected),
    models: filterBuckets(usage.models, selected),
    projects: filterBuckets(usage.projects, selected)
  }
}
