/**
 * 响应延迟分位数直方图 (Latency Distribution Histogram)：
 * 将调用耗时按照分桶统计 (<200ms, 200ms-1s, 1s-3s, 3s-10s, >10s)，直观呈现长尾性能分布。
 */
import { useMemo } from "react"
import { RiBarChartHorizontalLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"

const BUCKETS = [
  { id: "fast", label: "< 200ms", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
  { id: "smooth", label: "200ms - 1s", color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
  { id: "normal", label: "1s - 3s", color: "bg-cyan-500", textColor: "text-cyan-600 dark:text-cyan-400" },
  { id: "slow", label: "3s - 10s", color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
  { id: "long", label: "> 10s", color: "bg-rose-500", textColor: "text-rose-600 dark:text-rose-400" }
] as const

export function ObservabilityHistogramChart(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props

  const bucketStats = useMemo(() => {
    const counts: Record<string, number> = {
      fast: 0,
      smooth: 0,
      normal: 0,
      slow: 0,
      long: 0
    }

    for (const m of metrics) {
      const d = m.durationMs ?? 0
      if (d < 200) counts.fast++
      else if (d < 1000) counts.smooth++
      else if (d < 3000) counts.normal++
      else if (d < 10000) counts.slow++
      else counts.long++
    }

    const total = metrics.length || 1
    const maxCount = Math.max(...Object.values(counts), 1)

    return BUCKETS.map((b) => {
      const count = counts[b.id] ?? 0
      const percent = (count / total) * 100
      const barRatio = (count / maxCount) * 100
      return {
        ...b,
        count,
        percent,
        barRatio
      }
    })
  }, [metrics])

  if (metrics.length === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-separator-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <RiBarChartHorizontalLine className="size-4 text-cyan-500" />
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            延迟区间分布 (Latency Distribution)
          </h3>
        </div>
        <span className="text-[11px] font-mono text-text-tertiary">5 个耗时分桶</span>
      </div>

      <div className="flex flex-col gap-2 font-mono text-[11px]">
        {bucketStats.map((bucket) => (
          <div key={bucket.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={cx("font-semibold", bucket.textColor)}>
                {bucket.label}
              </span>
              <span className="text-text-tertiary">
                {bucket.count} 次 ({bucket.percent.toFixed(0)}%)
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-background-secondary-default overflow-hidden">
              <div
                style={{ width: `${bucket.barRatio}%` }}
                className={cx("h-full rounded-full transition-all", bucket.color)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
