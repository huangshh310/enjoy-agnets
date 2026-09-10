/**
 * 本机 CLI transcript 用量。只画聚合数字，不画额度条。
 */
import type { CliTranscriptUsage, CliUsageSource } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { CliUsageKpis } from "./cli-usage-kpis"
import { CliUsageBucketTable } from "./cli-usage-table"
import { CliUsageSourceChips } from "./components/source-chips"
import { grokRecordedTicks, hasMixedBreakdown, sumBuckets } from "./lib/format"

export function ObservabilityCliUsageView({ usage }: { usage: CliTranscriptUsage | undefined }) {
  const t = useT()
  if (!usage) return null
  const hasUsage = usage.sources.some((item) => item.status === "has-usage")
  if (!hasUsage) {
    const scannedEmpty = usage.sources.some((item) => item.status === "scanned-empty")
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
        <EmptyCopy>
          {scannedEmpty ? t("pages.observability.cliUsageNoTokens") : t("pages.observability.cliUsageEmpty")}
        </EmptyCopy>
        <CliUsageNote sources={usage.sources} />
      </div>
    )
  }
  const totals = sumBuckets(usage.days)
  const grokTicks = grokRecordedTicks(usage.sources)
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
      <CliUsageKpis
        totals={totals}
        mixed={hasMixedBreakdown(usage.sources)}
        grokTicks={grokTicks}
      />
      <CliUsageNote sources={usage.sources} />
      <CliUsageBucketTable
        title={t("pages.observability.cliUsageDays")}
        keyLabel={t("pages.observability.cliUsageDayCol")}
        rows={usage.days}
      />
      <CliUsageBucketTable
        title={t("pages.observability.cliUsageModels")}
        keyLabel={t("pages.observability.cliUsageModelCol")}
        rows={usage.models}
      />
      <CliUsageBucketTable
        title={t("pages.observability.cliUsageProjects")}
        keyLabel={t("pages.observability.cliUsageProjectCol")}
        rows={usage.projects}
      />
    </div>
  )
}

function CliUsageNote({ sources }: { sources: CliUsageSource[] }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-separator-border/70 bg-background-secondary-default/30 p-3">
      <p className="text-caption-2-medium text-text-tertiary">{t("pages.observability.cliUsageHint")}</p>
      <CliUsageSourceChips sources={sources} />
    </div>
  )
}

function EmptyCopy({ children }: { children: string }) {
  return (
    <div className="flex min-h-0 items-center justify-center rounded-xl border border-dashed border-separator-border/80 bg-background-secondary-default/20 px-6 py-10">
      <p className="max-w-md text-center text-caption-1-medium text-text-tertiary">{children}</p>
    </div>
  )
}
