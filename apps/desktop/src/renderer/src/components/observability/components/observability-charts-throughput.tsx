/**
 * Vercel AI SDK 7 Token 细分与吞吐时序复合图：
 * 原生响应式 SVG 渲染，结合 Prompt Token (输入) 与 Completion Token (输出) 堆叠柱状图，
 * 并叠加 tok/s 吞吐速率曲线。
 */
import { useMemo, useState } from "react"
import { RiSpeedUpLine } from "@remixicon/react"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function ObservabilityThroughputChart(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props
  const t = useT()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const sorted = useMemo(() => {
    return [...metrics].sort((a, b) => a.createdAt - b.createdAt)
  }, [metrics])

  const chartData = useMemo(() => {
    if (sorted.length === 0) return null

    const width = 800
    const height = 180
    const padding = { top: 20, right: 25, bottom: 30, left: 45 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom

    const maxThroughput = Math.max(...sorted.map((m) => m.tokensPerSecond ?? 0), 50)
    const maxTokens = Math.max(
      ...sorted.map((m) => (m.inputTokens ?? 0) + (m.outputTokens ?? 0)),
      1000
    )

    const points = sorted.map((m, i) => {
      const x =
        sorted.length > 1
          ? padding.left + (i / (sorted.length - 1)) * plotWidth
          : padding.left + plotWidth / 2

      const throughput = m.tokensPerSecond ?? 0
      const inputTokens = m.inputTokens ?? 0
      const outputTokens = m.outputTokens ?? 0
      const totalTokens = inputTokens + outputTokens

      const yThroughput =
        padding.top + plotHeight - (throughput / maxThroughput) * plotHeight
      const totalBarHeight = (totalTokens / maxTokens) * (plotHeight * 0.85)
      const inputBarHeight = totalTokens > 0 ? (inputTokens / totalTokens) * totalBarHeight : 0
      const outputBarHeight = totalBarHeight - inputBarHeight

      return {
        x,
        yThroughput,
        totalBarHeight,
        inputBarHeight,
        outputBarHeight,
        metric: m,
        throughput,
        inputTokens,
        outputTokens,
        totalTokens
      }
    })

    // 构建平滑吞吐曲线
    let path = ""
    let area = ""
    if (points.length > 0) {
      path = `M ${points[0]?.x} ${points[0]?.yThroughput}`
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        if (prev && curr) {
          const cp1x = prev.x + (curr.x - prev.x) / 2
          const cp1y = prev.yThroughput
          const cp2x = cp1x
          const cp2y = curr.yThroughput
          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.yThroughput}`
        }
      }

      const first = points[0]
      const last = points[points.length - 1]
      if (first && last) {
        area = `${path} L ${last.x} ${padding.top + plotHeight} L ${first.x} ${padding.top + plotHeight} Z`
      }
    }

    return {
      width,
      height,
      padding,
      plotHeight,
      plotWidth,
      maxThroughput,
      maxTokens,
      points,
      path,
      area
    }
  }, [sorted])

  if (!chartData || sorted.length === 0) return null

  const activePoint = hoverIndex !== null ? chartData.points[hoverIndex] : null

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-separator-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <RiSpeedUpLine className="size-4 text-purple-500" />
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.throughputTitle")}
          </h3>
        </div>

        <div className="flex items-center gap-3 text-[10.5px] font-mono text-text-tertiary">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded bg-blue-500" />
            <span className="text-text-secondary">{t("pages.observability.promptIn")}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded bg-purple-500" />
            <span className="text-text-secondary">{t("pages.observability.completionOut")}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-text-secondary">{t("pages.observability.rateToks")}</span>
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="w-full h-44 select-none"
        >
          <defs>
            <linearGradient id="tpAreaGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Y 轴刻度 */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartData.padding.top + chartData.plotHeight * (1 - ratio)
            const val = Math.round(chartData.maxThroughput * ratio)
            return (
              <g key={ratio}>
                <line
                  x1={chartData.padding.left}
                  y1={y}
                  x2={chartData.width - chartData.padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-separator-border/60"
                  strokeDasharray="3 3"
                />
                <text
                  x={chartData.padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-text-tertiary font-mono select-none"
                >
                  {t("pages.observability.tPerS", { n: val })}
                </text>
              </g>
            )
          })}

          {/* Token 消耗量双色堆叠柱状 */}
          {chartData.points.map((p, idx) => {
            const baseY = chartData.padding.top + chartData.plotHeight
            const inputY = baseY - p.inputBarHeight
            const outputY = inputY - p.outputBarHeight

            return (
              <g key={idx}>
                {/* Input Tokens (底部蓝色) */}
                {p.inputBarHeight > 0 ? (
                  <rect
                    x={p.x - 4}
                    y={inputY}
                    width={8}
                    height={p.inputBarHeight}
                    rx={1}
                    fill="#3b82f6"
                    fillOpacity={0.65}
                  />
                ) : null}

                {/* Output Tokens (顶部紫色) */}
                {p.outputBarHeight > 0 ? (
                  <rect
                    x={p.x - 4}
                    y={outputY}
                    width={8}
                    height={p.outputBarHeight}
                    rx={1}
                    fill="#a855f7"
                    fillOpacity={0.8}
                  />
                ) : null}
              </g>
            )
          })}

          {/* 吞吐量面积 */}
          {chartData.area ? <path d={chartData.area} fill="url(#tpAreaGrad2)" /> : null}

          {/* 吞吐量主曲线 */}
          {chartData.path ? (
            <path
              d={chartData.path}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ) : null}

          {/* 数据圆点 & Hover 触发区 */}
          {chartData.points.map((p, idx) => {
            const isHovered = hoverIndex === idx
            return (
              <g
                key={idx}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-pointer"
              >
                <circle cx={p.x} cy={p.yThroughput} r={12} fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.yThroughput}
                  r={isHovered ? 5 : 3.5}
                  fill="#10b981"
                  stroke="var(--background-primary-default, #fff)"
                  strokeWidth={isHovered ? 2 : 1.5}
                  className="transition-all"
                />
              </g>
            )
          })}

          {/* Hover 垂直指示线 */}
          {activePoint ? (
            <line
              x1={activePoint.x}
              y1={chartData.padding.top}
              x2={activePoint.x}
              y2={chartData.padding.top + chartData.plotHeight}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="2 2"
              className="pointer-events-none"
            />
          ) : null}
        </svg>

        {activePoint ? (
          <div
            style={{
              left: Math.min(Math.max(activePoint.x - 70, 10), chartData.width - 160),
              top: 8
            }}
            className="pointer-events-none absolute z-10 flex flex-col gap-0.5 rounded-lg border border-separator-border bg-background-primary-default p-2 text-[10.5px] font-mono shadow-md"
          >
            <div className="font-semibold text-text-primary border-b border-separator-border/40 pb-1 truncate max-w-[140px]">
              {activePoint.metric.modelId ?? t("pages.observability.default")}
            </div>
            <div className="flex items-center justify-between gap-2 text-text-primary mt-0.5">
              <span className="text-text-tertiary">{t("pages.observability.tooltipRate")}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {activePoint.throughput > 0
                  ? t("pages.observability.tokPerS", { n: activePoint.throughput.toFixed(1) })
                  : t("pages.observability.na")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-text-primary">
              <span className="text-text-tertiary">{t("pages.observability.tooltipPromptIn")}</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                {t("pages.observability.tokUnit", { n: activePoint.inputTokens })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-text-primary">
              <span className="text-text-tertiary">{t("pages.observability.tooltipCompletionOut")}</span>
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                {t("pages.observability.tokUnit", { n: activePoint.outputTokens })}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
