/**
 * 图廊一次只开一张图，顶上切换，避免整页滚动。
 */
import { useMemo, useState } from "react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { buildUsageChartModel } from "./usage-chart-data"
import { UsageSeriesGallery, type SeriesChartView } from "./usage-series-charts"
import { UsageShapeGallery, type ShapeChartView } from "./usage-shape-charts"

const TABS: Array<{ id: SeriesChartView | ShapeChartView; label: string }> = [
  { id: "composed", label: "组合" },
  { id: "portfolio", label: "对比" },
  { id: "percentiles", label: "分位" },
  { id: "growth", label: "增长" },
  { id: "shipments", label: "本周" },
  { id: "bars", label: "排行" },
  { id: "blocks", label: "日格" },
  { id: "radar", label: "雷达" },
  { id: "radial", label: "径向" },
  { id: "reliability", label: "健康" },
  { id: "sankey", label: "流向" }
]

const SERIES_VIEWS = new Set<string>(["percentiles", "portfolio", "growth", "shipments", "bars", "composed", "blocks"])

export function UsageChartGallery({
  tools,
  metric
}: {
  tools: AgentToolPublic[]
  metric: "tokens" | "cost"
}) {
  const model = useMemo(() => buildUsageChartModel(tools, metric), [tools, metric])
  const [view, setView] = useState<SeriesChartView | ShapeChartView>("composed")
  if (model.series.length === 0 && model.windows.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1 rounded-xl bg-background-secondary-default p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rounded-lg px-2.5 py-1 text-caption-2-medium ${
              view === tab.id
                ? "bg-background-primary-default text-text-primary shadow-2xs"
                : "text-text-tertiary hover:text-text-primary"
            }`}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {SERIES_VIEWS.has(view) ? (
        <UsageSeriesGallery model={model} view={view as SeriesChartView} />
      ) : (
        <UsageShapeGallery model={model} view={view as ShapeChartView} />
      )}
    </div>
  )
}
