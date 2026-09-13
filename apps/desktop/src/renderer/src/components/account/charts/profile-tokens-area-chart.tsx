/**
 * Token 趋势面积图：平滑贝塞尔 + accent token 渐变，无假默认总量。
 */
import { useState } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { growthBadgeClass } from "../constants"
import type { TokenTrendPoint } from "../types/profile.types"

interface ProfileTokensAreaChartProps {
  points: TokenTrendPoint[]
  totalTokensFormatted: string
  growthRate: string
}

export function ProfileTokensAreaChart({
  points,
  totalTokensFormatted,
  growthRate
}: ProfileTokensAreaChartProps) {
  const t = useT()
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const chartHeight = 90
  const chartWidth = 640
  const maxTokens = Math.max(...points.map((point) => point.tokens), 1)

  const coords = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * chartWidth
    const y = chartHeight - 12 - (point.tokens / maxTokens) * (chartHeight - 32)
    return { x, y, point }
  })

  let linePath = ""
  if (coords.length > 0) {
    linePath = `M ${coords[0]!.x},${coords[0]!.y}`
    for (let index = 0; index < coords.length - 1; index += 1) {
      const from = coords[index]!
      const to = coords[index + 1]!
      const controlX = (from.x + to.x) / 2
      linePath += ` C ${controlX},${from.y} ${controlX},${to.y} ${to.x},${to.y}`
    }
  }

  const areaPath = linePath
    ? `${linePath} L ${chartWidth},${chartHeight - 6} L 0,${chartHeight - 6} Z`
    : ""
  const activePoint = activeIdx !== null ? coords[activeIdx] : null
  const lastPoint = points[points.length - 1]

  return (
    <div className="flex select-none flex-col gap-2.5 rounded-2xl border border-separator-border/80 bg-background-primary-default p-4 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-text-tertiary">{t("pages.account.charts.tokens")}</span>
          <div className="mt-0.5 flex items-center gap-2">
            <h3 className="text-title-3-semibold text-text-primary">{totalTokensFormatted}</h3>
            <span
              className={cx(
                "inline-flex items-center rounded-md px-1.5 py-0.2 font-mono text-[10px] font-semibold",
                growthBadgeClass(growthRate, "accent")
              )}
            >
              {growthRate}
            </span>
          </div>
        </div>
        {activePoint ? (
          <div className="font-mono text-caption-2-medium text-accent-500">
            {activePoint.point.label}: <strong>{activePoint.point.formatted}</strong>
          </div>
        ) : null}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-24 w-full overflow-visible"
          preserveAspectRatio="none"
          onMouseLeave={() => setActiveIdx(null)}
        >
          <defs>
            <linearGradient id="tokens-area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity="0.38" />
              <stop offset="65%" stopColor="var(--color-accent-500)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity="0" />
            </linearGradient>
          </defs>
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
          {areaPath ? <path d={areaPath} fill="url(#tokens-area-gradient)" /> : null}
          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-accent-500)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ) : null}
          {coords.map((coord, index) => (
            <circle
              key={coord.point.id}
              cx={coord.x}
              cy={coord.y}
              r={activeIdx === index ? 4.5 : 2}
              onMouseEnter={() => setActiveIdx(index)}
              className={cx(
                "cursor-pointer transition-all",
                activeIdx === index
                  ? "fill-background-primary-default stroke-accent-600 stroke-2"
                  : "fill-accent-500 opacity-60 hover:opacity-100"
              )}
            />
          ))}
        </svg>
        <div className="flex justify-between pt-1 font-mono text-caption-2-medium text-text-tertiary">
          <span>{points[0]?.label ?? ""}</span>
          <span>{lastPoint?.label ?? ""}</span>
        </div>
      </div>
    </div>
  )
}
