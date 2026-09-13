/**
 * 本机记录多维图廊：日消耗+累计组合、模型排行、增长趋势、日格热力。
 * 对标 EvilCharts 图廊体系，顶部选项卡无缝切换。
 */
import { useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"
import { SpendChartTooltip } from "@renderer/components/settings/agent-tools/charts/spend-chart-tooltip"
import { UsageBlocksHeatmap } from "@renderer/components/settings/agent-tools/charts/usage-blocks-heatmap"
import { UsageChartCard } from "@renderer/components/settings/agent-tools/charts/usage-chart-card"
import { formatTokens } from "@renderer/components/settings/agent-tools/format-spend"
import { useT } from "@renderer/i18n"
import type { CliUsageChartModel } from "./cli-usage-chart-data"

export type CliGalleryView = "composed" | "models" | "growth" | "blocks"

const tickStyle = { fill: "var(--color-text-tertiary)", fontSize: 11 }

export function CliUsageGallery({ model }: { model: CliUsageChartModel }) {
  const t = useT()
  const [view, setView] = useState<CliGalleryView>("composed")

  const TABS: Array<{ id: CliGalleryView; label: string }> = [
    { id: "composed", label: t("pages.observability.cliUsageTabComposed") },
    { id: "models", label: t("pages.observability.cliUsageTabModels") },
    { id: "growth", label: t("pages.observability.cliUsageTabGrowth") },
    { id: "blocks", label: t("pages.observability.cliUsageTabBlocks") }
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-caption-2-medium text-text-tertiary">
          {t("pages.observability.cliUsageGalleryHint")}
        </span>
        <div className="flex flex-wrap gap-1 rounded-xl bg-background-secondary-default p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rounded-lg px-2.5 py-1 text-caption-2-medium transition-colors ${
                view === tab.id
                  ? "bg-background-primary-default text-text-primary shadow-2xs font-medium"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {view === "composed" && (
        <UsageChartCard
          title={t("pages.observability.cliUsageComposedTitle")}
          hint={t("pages.observability.cliUsageComposedHint")}
        >
          {model.composed.length === 0 ? (
            <p className="flex h-52 items-center justify-center text-caption-2-medium text-text-tertiary">
              {t("pages.observability.cliUsageEmptyBuckets")}
            </p>
          ) : (
            <div className="h-60 w-full min-w-0">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={model.composed} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--color-separator-border)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="day"
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <YAxis hide />
                  <Tooltip content={<SpendChartTooltip formatValue={formatTokens} />} />
                  <Bar
                    dataKey="tokens"
                    name={t("pages.observability.cliUsageDailyTokens")}
                    fill="var(--color-accent-500)"
                    fillOpacity={0.45}
                    radius={[3, 3, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name={t("pages.observability.cliUsageCumulativeTokens")}
                    stroke="var(--color-chart-5)"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </UsageChartCard>
      )}

      {view === "models" && (
        <UsageChartCard
          title={t("pages.observability.cliUsageModelRankingTitle")}
          hint={t("pages.observability.cliUsageModelRankingHint")}
        >
          {model.modelRanking.length === 0 ? (
            <p className="flex h-52 items-center justify-center text-caption-2-medium text-text-tertiary">
              {t("pages.observability.cliUsageEmptyBuckets")}
            </p>
          ) : (
            <div className="h-60 w-full min-w-0">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={model.modelRanking}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 12, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={130}
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<SpendChartTooltip formatValue={formatTokens} />} />
                  <Bar
                    dataKey="amount"
                    name={t("pages.observability.cliUsageTotal")}
                    radius={[0, 6, 6, 0]}
                    fill="var(--color-accent-500)"
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </UsageChartCard>
      )}

      {view === "growth" && (
        <UsageChartCard
          title={t("pages.observability.cliUsageGrowthTitle")}
          hint={t("pages.observability.cliUsageGrowthHint")}
        >
          {model.growth.length === 0 ? (
            <p className="flex h-52 items-center justify-center text-caption-2-medium text-text-tertiary">
              {t("pages.observability.cliUsageEmptyBuckets")}
            </p>
          ) : (
            <div className="h-60 w-full min-w-0">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={model.growth} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--color-separator-border)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="day"
                    tick={tickStyle}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <Tooltip content={<SpendChartTooltip formatValue={formatTokens} />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name={t("pages.observability.cliUsageCumulativeTokens")}
                    stroke="var(--color-accent-500)"
                    fill="var(--color-accent-500)"
                    fillOpacity={0.22}
                    strokeWidth={1.8}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </UsageChartCard>
      )}

      {view === "blocks" && (
        <div className="mx-auto w-full max-w-4xl">
          <UsageBlocksHeatmap dailyTotal={model.dailyTotal} formatValue={formatTokens} />
        </div>
      )}
    </div>
  )
}
