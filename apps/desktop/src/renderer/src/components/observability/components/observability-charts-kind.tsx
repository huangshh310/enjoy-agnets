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
  agent: "bg-blue-500 text-blue-600 dark:text-blue-400",
  stream: "bg-emerald-500 text-emerald-600 dark:text-emerald-400",
  image: "bg-purple-500 text-purple-600 dark:text-purple-400",
  video: "bg-rose-500 text-rose-600 dark:text-rose-400",
  embed: "bg-amber-500 text-amber-600 dark:text-amber-400"
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
    color: KIND_COLORS[kind] ?? "bg-blue-500 text-blue-600 dark:text-blue-400"
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
          <RiPieChartLine className="size-4 text-emerald-500" />
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.kindTitle")}
          </h3>
        </div>
        <span className="text-[11px] font-mono text-text-tertiary">
          {t("pages.observability.kindCount", { n: kindStats.length })}
        </span>
      </div>

      <div className="flex flex-col gap-2 font-mono text-[11px]">
        {kindStats.map((stat) => {
          const meta = kindMeta(t, stat.kind)

          return (
            <div key={stat.kind} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-text-primary uppercase">
                    {stat.kind}
                  </span>
                  <span className="text-[10px] text-text-tertiary">({meta.label})</span>
                </div>

                <div className="flex items-center gap-2 text-text-tertiary">
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
