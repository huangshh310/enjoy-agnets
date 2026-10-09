/**
 * 状态健康度 Donut 环形图看板 (Status Health Donut Chart)
 */
import { useMemo } from "react"
import { RiShieldCheckLine } from "@remixicon/react"
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

    for (const m of metrics) {
      if (m.status === "success" || m.status === "completed" || m.status === "ok") {
        success++
      } else if (m.status === "running") {
        running++
      } else if (m.errorClass === "timeout") {
        timeout++
      } else if (m.errorClass === "provider") {
        providerErr++
      } else {
        otherErr++
      }
    }

    const total = metrics.length || 1
    const successRate = (success / total) * 100

    return {
      success,
      timeout,
      providerErr,
      otherErr,
      running,
      total,
      successRate
    }
  }, [metrics])

  // SVG 环形图弧度计算
  const circumference = 2 * Math.PI * 34
  const successStroke = (stats.success / stats.total) * circumference
  const timeoutStroke = (stats.timeout / stats.total) * circumference
  const providerStroke = (stats.providerErr / stats.total) * circumference
  const otherStroke = (stats.otherErr / stats.total) * circumference

  if (metrics.length === 0) return null

  return (
    <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs min-w-0">
      <div className="flex items-center justify-between border-b border-separator-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <RiShieldCheckLine className="size-4 text-state-success-text" />
          <h4 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.healthTitle")}
          </h4>
        </div>
        <span
          className={`rounded-md px-1.5 py-0.5 font-mono text-caption-2-semibold font-semibold ${
            stats.successRate >= 90
              ? "bg-state-success-text/10 text-state-success-text dark:text-state-success-text"
              : stats.successRate >= 70
                ? "bg-status-yellow-background/10 text-status-yellow-text dark:text-status-yellow-text"
                : "bg-background-tertiary-error/10 text-text-error-primary dark:text-text-error-primary"
          }`}
        >
          {stats.successRate >= 90 ? "状态良好" : stats.successRate >= 70 ? "存在关注项" : "稳定性偏低"}
        </span>
      </div>

      <div className="my-2 flex flex-wrap items-center justify-around gap-3 min-w-0">
        {/* SVG Donut 环 */}
        <div className="relative size-22 shrink-0 flex items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 88 88">
            <circle
              cx="44"
              cy="44"
              r="34"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="9"
              className="text-background-secondary-default"
            />
            {/* Success */}
            <circle
              cx="44"
              cy="44"
              r="34"
              fill="transparent"
              stroke="var(--color-chart-success)"
              strokeWidth="9"
              strokeDasharray={`${successStroke} ${circumference}`}
              strokeDashoffset="0"
              className="transition-all"
            />
            {/* Timeout */}
            {stats.timeout > 0 ? (
              <circle
                cx="44"
                cy="44"
                r="34"
                fill="transparent"
                stroke="var(--color-chart-warning)"
                strokeWidth="9"
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
                r="34"
                fill="transparent"
                stroke="var(--color-chart-danger)"
                strokeWidth="9"
                strokeDasharray={`${providerStroke + otherStroke} ${circumference}`}
                strokeDashoffset={-(successStroke + timeoutStroke)}
                className="transition-all"
              />
            ) : null}
          </svg>
          <div className="absolute flex flex-col items-center justify-center font-mono">
            <span className="text-body-medium font-bold text-text-primary">
              {stats.successRate.toFixed(0)}%
            </span>
            <span className="text-caption-2-regular text-text-tertiary">
              {t("pages.observability.successRate")}
            </span>
          </div>
        </div>

        {/* 图例列表 */}
        <div className="flex flex-col gap-1.5 text-caption-2-regular font-mono shrink-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="size-2 rounded-full bg-state-success-base shrink-0" />
            <span className="text-text-secondary whitespace-nowrap">
              {t("pages.observability.successN", { n: stats.success })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="size-2 rounded-full bg-status-yellow-background shrink-0" />
            <span className="text-text-secondary whitespace-nowrap">
              {t("pages.observability.timeoutN", { n: stats.timeout })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="size-2 rounded-full bg-background-tertiary-error shrink-0" />
            <span className="text-text-secondary whitespace-nowrap">
              {t("pages.observability.errorN", { n: stats.providerErr + stats.otherErr })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
