/**
 * 本机记录核心双图展台：环形占比图 + 时序趋势面积图。
 * 对标订阅大盘的 SettingsHub 双图区，支持维度切换。
 */
import { useState } from "react"
import type { CliUsageSourceId } from "@enjoy-agents/ipc-contract"
import { formatTokens } from "@renderer/components/settings/agent-tools/format-spend"
import { useT } from "@renderer/i18n"
import { CliUsageAreaChart } from "./cli-usage-area-chart"
import type { CliUsageChartModel } from "./cli-usage-chart-data"
import { CliUsagePieChart } from "./cli-usage-pie-chart"

type PieMode = "sources" | "models"
type AreaMetric = "breakdown" | "total"

export function CliUsageChartDock({
  model,
  selectedId,
  onSelectSource
}: {
  model: CliUsageChartModel
  selectedId: CliUsageSourceId | null
  onSelectSource: (id: CliUsageSourceId) => void
}) {
  const t = useT()
  const [pieMode, setPieMode] = useState<PieMode>("sources")
  const [areaMetric, setAreaMetric] = useState<AreaMetric>("breakdown")

  const pieSlices = pieMode === "sources" ? model.cliSlices : model.modelSlices
  const pieTitle =
    pieMode === "sources"
      ? t("pages.observability.cliUsageContribution")
      : t("pages.observability.cliUsageModels")

  return (
    <section className="overflow-hidden rounded-xl border border-separator-border/70 bg-background-primary-default p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-separator-border/50 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.cliUsageChartDockTitle")}
          </h3>
          <span className="text-caption-2-medium text-text-tertiary">
            {t("pages.observability.cliUsageChartDockDesc")}
          </span>
          {selectedId ? (
            <span className="rounded-md bg-accent-500/10 px-2 py-0.5 text-caption-2-medium text-accent-500 font-medium">
              {t("pages.observability.cliUsageShowingSource", {
                name: t(`pages.observability.cliUsageSource.${selectedId}`)
              })}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={pieMode}
            onChange={setPieMode}
            items={[
              ["sources", t("pages.observability.cliUsageContribution")],
              ["models", t("pages.observability.cliUsageModels")]
            ]}
          />
          <Segmented
            value={areaMetric}
            onChange={setAreaMetric}
            items={[
              ["breakdown", t("pages.observability.cliUsageBreakdown")],
              ["total", t("pages.observability.cliUsageTotalTrend")]
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-5 min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-caption-2-medium text-text-tertiary">{pieTitle}</span>
          </div>
          <CliUsagePieChart
            slices={pieSlices}
            type={pieMode}
            selectedId={pieMode === "sources" ? selectedId : null}
            centerPrimary={formatTokens(model.totalTokens)}
            centerUnit={t("pages.observability.cliUsageTotal")}
            emptyMessage={t("pages.observability.cliUsageEmptyBuckets")}
            onSelectSlice={(id) => {
              if (pieMode === "sources") {
                onSelectSource(id as CliUsageSourceId)
              }
            }}
          />
        </div>

        <div className="min-w-0 lg:col-span-7">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-caption-2-medium text-text-tertiary">
              {t("pages.observability.cliUsageDaysTrend")}
            </span>
          </div>
          <CliUsageAreaChart
            days={model.daysTrend}
            metric={areaMetric}
            emptyMessage={t("pages.observability.cliUsageEmptyBuckets")}
          />
        </div>
      </div>
    </section>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  items
}: {
  value: T
  onChange: (value: T) => void
  items: ReadonlyArray<readonly [T, string]>
}) {
  return (
    <div className="flex rounded-lg bg-background-secondary-default p-0.5 text-caption-2-medium">
      {items.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={`rounded-md px-2.5 py-1 transition-colors ${
            value === key
              ? "bg-background-primary-default text-text-primary shadow-2xs font-medium"
              : "text-text-tertiary hover:text-text-primary"
          }`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
