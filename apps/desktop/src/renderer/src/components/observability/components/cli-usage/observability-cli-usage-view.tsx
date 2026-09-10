/**
 * 本机 Claude / Codex transcript 用量。只画聚合数字，不画额度条。
 */
import type { CliTranscriptUsage, CliUsageSource } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { CliUsageKpis } from "./cli-usage-kpis"
import { CliUsageBucketTable } from "./cli-usage-table"
import { sumBuckets } from "./cli-usage-format"

export function ObservabilityCliUsageView({ usage }: { usage: CliTranscriptUsage | undefined }) {
  const t = useT()
  if (!usage) return null
  const sessions = usage.sources.reduce((sum, item) => sum + item.sessionCount, 0)
  if (sessions === 0) {
    const foundDir = usage.sources.some((item) => item.found)
    return (
      <EmptyCopy>
        {foundDir ? t("pages.observability.cliUsageNoTokens") : t("pages.observability.cliUsageEmpty")}
      </EmptyCopy>
    )
  }
  const totals = sumBuckets(usage.days)
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
      <CliUsageKpis totals={totals} />
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
    <div className="flex flex-col gap-2 rounded-xl border border-separator-border/70 bg-background-secondary-default/30 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-caption-2-medium text-text-secondary">{t("pages.observability.cliUsageHint")}</p>
      <div className="flex shrink-0 flex-wrap gap-2">
        {sources.map((source) => (
          <SourceChip key={source.id} source={source} />
        ))}
      </div>
    </div>
  )
}

function SourceChip({ source }: { source: CliUsageSource }) {
  const t = useT()
  const name =
    source.id === "claude" ? t("pages.observability.cliUsageClaude") : t("pages.observability.cliUsageCodex")
  const text = source.found
    ? t("pages.observability.cliUsageSourceFound", { name, n: source.sessionCount })
    : t("pages.observability.cliUsageSourceMissing", { name })
  return (
    <span
      className={cx(
        "rounded-full px-2.5 py-1 text-caption-2-medium",
        source.found
          ? "border border-separator-border/70 bg-background-primary-default text-text-secondary"
          : "border border-dashed border-separator-border text-text-tertiary"
      )}
    >
      {text}
    </span>
  )
}

function EmptyCopy({ children }: { children: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-separator-border/80 bg-background-secondary-default/20 px-6 py-10">
      <p className="max-w-md text-center text-caption-1-medium text-text-tertiary">{children}</p>
    </div>
  )
}
