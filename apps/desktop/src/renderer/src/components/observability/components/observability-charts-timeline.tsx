/**
 * 耗时与 TTFO 时序趋势面积图 (Timeline Area & Line Chart)：
 * 原生响应式 SVG 渲染，支持平滑贝塞尔渐变面积、耗时与 TTFO 双轨对比、
 * 数据节点悬浮 Tooltip 探查。
 */
import { useMemo, useState } from "react"
import { RiTimeLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function ObservabilityTimelineChart(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props
  const t = useT()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  // 按时间升序排序
  const sorted = useMemo(() => {
    return [...metrics].sort((a, b) => a.createdAt - b.createdAt)
  }, [metrics])

  // 计算图表坐标点
  const chartData = useMemo(() => {
    if (sorted.length === 0) return null

    const width = 800
    const height = 180
    const padding = { top: 20, right: 25, bottom: 30, left: 45 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom

    const maxDuration = Math.max(...sorted.map((m) => m.durationMs ?? 0), 1000)

    const points = sorted.map((m, i) => {
      const x =
        sorted.length > 1
          ? padding.left + (i / (sorted.length - 1)) * plotWidth
          : padding.left + plotWidth / 2
      const duration = m.durationMs ?? 0
      const ttfo = m.ttfoMs ?? 0
      const yDuration = padding.top + plotHeight - (duration / maxDuration) * plotHeight
      const yTtfo = ttfo > 0 ? padding.top + plotHeight - (ttfo / maxDuration) * plotHeight : null

      return {
        x,
        yDuration,
        yTtfo,
        metric: m,
        duration,
        ttfo
      }
    })

    // 构建平滑 SVG 路径
    let durationPath = ""
    let areaPath = ""
    let ttfoPath = ""

    if (points.length > 0) {
      durationPath = `M ${points[0]?.x} ${points[0]?.yDuration}`
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        if (prev && curr) {
          const cp1x = prev.x + (curr.x - prev.x) / 2
          const cp1y = prev.yDuration
          const cp2x = cp1x
          const cp2y = curr.yDuration
          durationPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.yDuration}`
        }
      }

      const firstPoint = points[0]
      const lastPoint = points[points.length - 1]
      if (firstPoint && lastPoint) {
        areaPath = `${durationPath} L ${lastPoint.x} ${padding.top + plotHeight} L ${firstPoint.x} ${padding.top + plotHeight} Z`
      }

      // TTFO 曲线
      const ttfoPoints = points.filter((p) => p.yTtfo !== null)
      if (ttfoPoints.length > 0 && ttfoPoints[0]) {
        ttfoPath = `M ${ttfoPoints[0].x} ${ttfoPoints[0].yTtfo}`
        for (let i = 1; i < ttfoPoints.length; i++) {
          const prev = ttfoPoints[i - 1]
          const curr = ttfoPoints[i]
          if (prev && curr && prev.yTtfo !== null && curr.yTtfo !== null) {
            ttfoPath += ` L ${curr.x} ${curr.yTtfo}`
          }
        }
      }
    }

    return {
      width,
      height,
      padding,
      plotHeight,
      plotWidth,
      maxDuration,
      points,
      durationPath,
      areaPath,
      ttfoPath
    }
  }, [sorted])

  if (!chartData || sorted.length === 0) {
    return null
  }

  const activePoint = hoverIndex !== null ? chartData.points[hoverIndex] : null

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
      {/* 头部指标与图例 */}
      <div className="flex items-center justify-between border-b border-separator-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <RiTimeLine className="size-4 text-blue-500" />
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.timelineTitle")}
          </h3>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-500" />
            <span className="text-text-secondary">{t("pages.observability.legendDuration")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            <span className="text-text-secondary">{t("pages.observability.legendTtfo")}</span>
          </span>
        </div>
      </div>

      {/* SVG 图表主体 */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="w-full h-44 select-none"
        >
          <defs>
            {/* 渐变填充 */}
            <linearGradient id="durationAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Y 轴水平辅助刻度线 */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartData.padding.top + chartData.plotHeight * (1 - ratio)
            const val = Math.round((chartData.maxDuration * ratio) / 100) * 100
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
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}s` : `${val}ms`}
                </text>
              </g>
            )
          })}

          {/* 面积渐变背景 */}
          {chartData.areaPath ? (
            <path d={chartData.areaPath} fill="url(#durationAreaGrad)" />
          ) : null}

          {/* 总耗时主曲线 */}
          {chartData.durationPath ? (
            <path
              d={chartData.durationPath}
              fill="none"
              stroke="var(--color-accent-500)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ) : null}

          {/* TTFO 虚线曲线 */}
          {chartData.ttfoPath ? (
            <path
              d={chartData.ttfoPath}
              fill="none"
              stroke="var(--color-chart-warning)"
              strokeWidth="1.8"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          ) : null}

          {/* 数据圆点 & Hover 触发区 */}
          {chartData.points.map((p, idx) => {
            const isHovered = hoverIndex === idx
            const isSuccess =
              p.metric.status === "success" ||
              p.metric.status === "completed" ||
              p.metric.status === "ok"

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-pointer"
              >
                {/* 隐藏的大触摸热区 */}
                <circle cx={p.x} cy={p.yDuration} r={12} fill="transparent" />

                {/* 实际圆点 */}
                <circle
                  cx={p.x}
                  cy={p.yDuration}
                  r={isHovered ? 5 : 3.5}
                  fill={isSuccess ? "var(--color-accent-500)" : "var(--color-chart-danger)"}
                  stroke="var(--color-background-primary-default)"
                  strokeWidth={isHovered ? 2 : 1.5}
                  className="transition-all"
                />

                {p.yTtfo !== null ? (
                  <circle
                    cx={p.x}
                    cy={p.yTtfo}
                    r={isHovered ? 4 : 2.5}
                    fill="var(--color-chart-warning)"
                    stroke="var(--color-background-primary-default)"
                    strokeWidth={1}
                  />
                ) : null}
              </g>
            )
          })}

          {/* Hover 垂直参考指示虚线 */}
          {activePoint ? (
            <line
              x1={activePoint.x}
              y1={chartData.padding.top}
              x2={activePoint.x}
              y2={chartData.padding.top + chartData.plotHeight}
              stroke="var(--color-accent-500)"
              strokeWidth="1"
              strokeDasharray="2 2"
              className="pointer-events-none"
            />
          ) : null}
        </svg>

        {/* 交互 Tooltip 浮层 */}
        {activePoint ? (
          <div
            style={{
              left: Math.min(Math.max(activePoint.x - 70, 10), chartData.width - 150),
              top: 8
            }}
            className="pointer-events-none absolute z-10 flex flex-col gap-0.5 rounded-lg border border-separator-border bg-background-primary-default p-2 text-[10.5px] font-mono shadow-md"
          >
            <div className="flex items-center justify-between gap-2 border-b border-separator-border/40 pb-1 font-semibold text-text-primary">
              <span>{activePoint.metric.kind.toUpperCase()}</span>
              <span
                className={cx(
                  "uppercase",
                  activePoint.metric.status === "success" ||
                    activePoint.metric.status === "completed"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {activePoint.metric.status}
              </span>
            </div>
            <div className="text-text-secondary truncate max-w-[140px]">
              {activePoint.metric.modelId ?? t("pages.observability.default")}
            </div>
            <div className="flex items-center justify-between gap-2 text-text-primary mt-0.5">
              <span className="text-text-tertiary">{t("pages.observability.tooltipDuration")}</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {activePoint.duration}ms
              </span>
            </div>
            {activePoint.ttfo > 0 ? (
              <div className="flex items-center justify-between gap-2 text-text-primary">
                <span className="text-text-tertiary">{t("pages.observability.tooltipTtfo")}</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {activePoint.ttfo}ms
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
