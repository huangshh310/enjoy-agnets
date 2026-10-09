/**
 * 工作负载类型分布与性能对比图 (Workload Kind Breakdown Chart)：
 * 分析 AGENT, STREAM, IMAGE, VIDEO, EMBED 各类型的频次与平均耗时对比。
 */
import { useMemo } from "react"
import { RiPieChartLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT, type TranslateFn } from "@renderer/i18n"

const KIND_COLORS: Record<string, string> = {
  agent: "bg-accent-500 text-accent-500 dark:text-accent-500",
  stream: "bg-state-success-base text-state-success-text dark:text-state-success-text",
  image: "bg-chart-5 text-chart-5 dark:text-chart-5",
  video: "bg-background-tertiary-error text-text-error-primary dark:text-text-error-primary",
  embed: "bg-status-yellow-background text-status-yellow-text dark:text-status-yellow-text"
}

const KIND_LABEL_KEYS: Record<string, string> = {
  agent: "pages.observability.kindAgent",
  stream: "pages.observability.kindStream",
  image: "pages.observability.kindImage",
  video: "pages.observability.kindVideo",
  embed: "pages.observability.kindEmbed"
}

function kindMeta(t: TranslateFn, kind: string) {
  const key = KIND_LABEL_KEYS[kind]
  return {
    label: key ? t(key) : kind.toUpperCase(),
    color: KIND_COLORS[kind] ?? "bg-accent-500 text-accent-500 dark:text-accent-500"
  }
}

export function ObservabilityKindChart(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props
  const t = useT()

  const kindStats = useMemo(() => {
    const map = new Map<
      string,
      {
        kind: string
        calls: number
        successCalls: number
        durations: number[]
      }
    >()

    for (const m of metrics) {
      const k = m.kind.toLowerCase()
      const current = map.get(k) ?? {
        kind: k,
        calls: 0,
        successCalls: 0,
        durations: []
      }

      current.calls++
      const isSuccess =
        m.status === "success" || m.status === "completed" || m.status === "ok"
      if (isSuccess) current.successCalls++
      if (m.durationMs) current.durations.push(m.durationMs)

      map.set(k, current)
    }

    const total = metrics.length || 1
    return Array.from(map.values())
      .map((item) => {
        const avgDurationMs =
          item.durations.length > 0
            ? Math.round(item.durations.reduce((a, b) => a + b, 0) / item.durations.length)
            : 0
        const successRate = (item.successCalls / item.calls) * 100
        const percent = (item.calls / total) * 100
        return {
          ...item,
          avgDurationMs,
          successRate,
          percent
        }
      })
      .sort((a, b) => b.calls - a.calls)
  }, [metrics])

  if (metrics.length === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-separator-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <RiPieChartLine className="size-4 text-state-success-text" />
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.kindTitle")}
          </h3>
        </div>
        <span className="text-caption-2-regular font-mono text-text-tertiary">
          {t("pages.observability.kindCount", { n: kindStats.length })}
        </span>
      </div>

      <div className="flex flex-col gap-2 font-mono text-caption-2-regular">
        {kindStats.map((stat) => {
          const meta = kindMeta(t, stat.kind)

          return (
            <div key={stat.kind} className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-text-primary uppercase truncate" title={stat.kind}>
                    {stat.kind}
                  </span>
                  <span className="text-caption-2-regular text-text-tertiary shrink-0">({meta.label})</span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 text-text-tertiary shrink-0 whitespace-nowrap">
                  <span className="text-text-secondary font-medium">
                    {t("pages.observability.timesPercentSpaced", {
                      n: stat.calls,
                      percent: stat.percent.toFixed(0)
                    })}
                  </span>
                  <span>·</span>
                  <span>
                    {stat.avgDurationMs >= 1000
                      ? `${(stat.avgDurationMs / 1000).toFixed(1)}s`
                      : `${stat.avgDurationMs}ms`}
                  </span>
                </div>
              </div>

              <div className="h-2 w-full rounded-full bg-background-secondary-default overflow-hidden">
                <div
                  style={{ width: `${stat.percent}%` }}
                  className={cx("h-full rounded-full transition-all", meta.color.split(" ")[0])}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
