/**
 * 选中月份的 Agent 调度柱状图：真实每日 run 数，空日为矮柱 0。
 */
import { useState } from "react"
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { AgentBarPoint } from "../types/profile.types"

interface ProfileAgentsBarChartProps {
  points: AgentBarPoint[]
  totalAgentsCount: number
  currentMonthLabel: string
  canGoNextMonth: boolean
  onPrevMonth: () => void
  onNextMonth: () => void
}

export function ProfileAgentsBarChart({
  points,
  totalAgentsCount,
  currentMonthLabel,
  canGoNextMonth,
  onPrevMonth,
  onNextMonth
}: ProfileAgentsBarChartProps) {
  const t = useT()
  const [hoveredPoint, setHoveredPoint] = useState<AgentBarPoint | null>(null)
  const maxCount = Math.max(...points.map((point) => point.count), 1)
  const chartHeight = 110
  const chartWidth = 640
  const barWidth = 8
  const spacing = (chartWidth - points.length * barWidth) / Math.max(points.length - 1, 1)
  const lastPoint = points[points.length - 1]

  return (
    <div className="flex select-none flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-caption-2-medium text-text-tertiary">{t("pages.account.charts.agents")}</span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <h3 className="text-title-2-semibold text-text-primary">{totalAgentsCount} {t("pages.account.charts.runsUnit")}</h3>
            {hoveredPoint ? (
              <span className="font-mono text-caption-2-medium text-accent-500">
                {hoveredPoint.label}: <strong>{hoveredPoint.count}</strong>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-separator-border/70 bg-background-secondary-default/50 px-2 py-1 text-caption-2-medium text-text-secondary">
          <button
            type="button"
            onClick={onPrevMonth}
            className="cursor-pointer text-text-tertiary transition-colors hover:text-text-primary"
          >
            <RiArrowLeftSLine className="size-4" />
          </button>
          <span className="px-1 text-caption-2-medium text-text-primary">{currentMonthLabel}</span>
          <button
            type="button"
            onClick={onNextMonth}
            disabled={!canGoNextMonth}
            className={cx(
              "text-text-tertiary transition-colors",
              canGoNextMonth ? "cursor-pointer hover:text-text-primary" : "cursor-default opacity-30"
            )}
          >
            <RiArrowRightSLine className="size-4" />
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-28 w-full overflow-visible"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1={chartHeight - 6}
            x2={chartWidth}
            y2={chartHeight - 6}
            stroke="currentColor"
            className="text-separator-border/60"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          {points.map((point, idx) => {
            const barHeight = Math.max((point.count / maxCount) * (chartHeight - 20), 4)
            const x = idx * (barWidth + spacing)
            const y = chartHeight - 6 - barHeight
            const hovered = hoveredPoint?.id === point.id
            return (
              <rect
                key={point.id}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3.5"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                className={cx(
                  "cursor-pointer transition-all duration-200",
                  hovered
                    ? "fill-accent-500 opacity-100"
                    : point.isToday
                      ? "fill-accent-600 opacity-95"
                      : "fill-accent-300/70 hover:fill-accent-400"
                )}
              />
            )
          })}
        </svg>
        <div className="flex justify-between pt-1 font-mono text-caption-2-medium text-text-tertiary">
          <span>{points[0]?.label ?? t("pages.account.charts.day", { n: 1 })}</span>
          <span>{lastPoint?.isToday ? t("pages.account.heatmap.today") : (lastPoint?.label ?? "")}</span>
        </div>
      </div>
    </div>
  )
}
