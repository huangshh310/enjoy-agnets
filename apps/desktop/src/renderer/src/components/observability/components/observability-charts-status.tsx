/**
 * 状态健康度 Donut 环形图与异常根因分析图表 (Status & Error Donut Chart)
 */
import { useMemo } from "react"
import { RiAlertLine, RiShieldCheckLine } from "@remixicon/react"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function ObservabilityStatusChart(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props
  const t = useT()

  const stats = useMemo(() => {
    let success = 0
    let timeout = 0
    let providerErr = 0
    let otherErr = 0
    let running = 0

    const errorMap = new Map<string, number>()

    for (const m of metrics) {
      if (m.status === "success" || m.status === "completed" || m.status === "ok") {
        success++
      } else if (m.status === "running") {
        running++
      } else if (m.errorClass === "timeout") {
        timeout++
        errorMap.set("timeout", (errorMap.get("timeout") ?? 0) + 1)
      } else if (m.errorClass === "provider") {
        providerErr++
        errorMap.set("provider", (errorMap.get("provider") ?? 0) + 1)
      } else {
        otherErr++
        const errType = m.errorClass || "general_error"
        errorMap.set(errType, (errorMap.get(errType) ?? 0) + 1)
      }
    }

    const total = metrics.length || 1
    const errorsList = Array.from(errorMap.entries()).map(([type, count]) => ({
      type,
      count,
      percent: (count / total) * 100
    }))

    return {
      success,
      timeout,
      providerErr,
      otherErr,
      running,
      total,
      errorsList
    }
  }, [metrics])

  // SVG 环形图弧度计算
  const circumference = 2 * Math.PI * 36
  const successStroke = (stats.success / stats.total) * circumference
  const timeoutStroke = (stats.timeout / stats.total) * circumference
  const providerStroke = (stats.providerErr / stats.total) * circumference
  const otherStroke = (stats.otherErr / stats.total) * circumference

  if (metrics.length === 0) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs min-w-0">
      {/* 左侧：SVG Donut 状态健康度 */}
      <div className="flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-separator-border/50 pb-3 sm:pb-0 sm:pr-3 min-w-0">
        <div className="flex items-center gap-2">
          <RiShieldCheckLine className="size-4 text-emerald-500" />
          <h4 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.healthTitle")}
          </h4>
        </div>

        <div className="my-2 flex flex-wrap items-center justify-around gap-3 sm:gap-4 min-w-0">
          {/* SVG 环 */}
          <div className="relative size-24 shrink-0 flex items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 88 88">
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="10"
                className="text-background-secondary-default"
              />
              {/* Success */}
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="transparent"
                stroke="var(--color-chart-success)"
                strokeWidth="10"
                strokeDasharray={`${successStroke} ${circumference}`}
                strokeDashoffset="0"
                className="transition-all"
              />
              {/* Timeout */}
              {stats.timeout > 0 ? (
                <circle
                  cx="44"
                  cy="44"
                  r="36"
                  fill="transparent"
                  stroke="var(--color-chart-warning)"
                  strokeWidth="10"
                  strokeDasharray={`${timeoutStroke} ${circumference}`}
                  strokeDashoffset={-successStroke}
                  className="transition-all"
                />
              ) : null}
              {/* Provider / Other Error */}
              {stats.providerErr + stats.otherErr > 0 ? (
                <circle
                  cx="44"
                  cy="44"
                  r="36"
                  fill="transparent"
                  stroke="var(--color-chart-danger)"
                  strokeWidth="10"
                  strokeDasharray={`${providerStroke + otherStroke} ${circumference}`}
                  strokeDashoffset={-(successStroke + timeoutStroke)}
                  className="transition-all"
                />
              ) : null}
            </svg>
            <div className="absolute flex flex-col items-center justify-center font-mono">
              <span className="text-body-medium font-bold text-text-primary">
                {((stats.success / stats.total) * 100).toFixed(0)}%
              </span>
              <span className="text-[9px] text-text-tertiary">
                {t("pages.observability.successRate")}
              </span>
            </div>
          </div>

          {/* 图例列表 (强制 whitespace-nowrap 绝不折行成竖排文字) */}
          <div className="flex flex-col gap-1.5 text-[11px] font-mono shrink-0">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-text-secondary whitespace-nowrap">
                {t("pages.observability.successN", { n: stats.success })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="size-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-text-secondary whitespace-nowrap">
                {t("pages.observability.timeoutN", { n: stats.timeout })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="size-2 rounded-full bg-rose-500 shrink-0" />
              <span className="text-text-secondary whitespace-nowrap">
                {t("pages.observability.errorN", { n: stats.providerErr + stats.otherErr })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：异常根因细分 */}
      <div className="flex flex-col justify-between sm:pl-2 min-w-0">
        <div className="flex items-center gap-2">
          <RiAlertLine className="size-4 text-rose-500" />
          <h4 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.errorDistTitle")}
          </h4>
        </div>

        {stats.errorsList.length === 0 ? (
          <div className="my-auto text-center text-[11px] text-emerald-600 dark:text-emerald-400 font-medium py-3">
            {t("pages.observability.allHealthy")}
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2 font-mono text-[11px]">
            {stats.errorsList.map((err) => (
              <div key={err.type} className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="font-semibold text-rose-600 dark:text-rose-400 truncate text-[11px]" title={err.type}>
                    {err.type}
                  </span>
                  <span className="text-text-tertiary shrink-0 text-[10px] font-mono whitespace-nowrap">
                    {t("pages.observability.timesPercentSpaced", {
                      n: err.count,
                      percent: err.percent.toFixed(0)
                    })}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-background-secondary-default overflow-hidden">
                  <div
                    style={{ width: `${err.percent}%` }}
                    className="h-full bg-rose-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
