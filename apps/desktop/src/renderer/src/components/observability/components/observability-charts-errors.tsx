/**
 * 异常根因与错误分类排行看板 (Error Distribution & Root Causes Chart)：
 * 分析并汇总超时、供应商异常、频控拦截等异常类目，提供排错定位依据。
 */
import { useMemo } from "react"
import { RiAlertLine, RiCheckLine } from "@remixicon/react"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function ObservabilityErrorChart(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props
  const t = useT()

  const { errorsList, failedCount } = useMemo(() => {
    const errorMap = new Map<string, number>()
    let failed = 0

    for (const m of metrics) {
      const isFailed =
        m.status === "failed" || m.status === "error" || (m.errorClass && m.errorClass !== "ok")
      if (isFailed) {
        failed++
        const errType = m.errorClass || "other_error"
        errorMap.set(errType, (errorMap.get(errType) ?? 0) + 1)
      }
    }

    const total = metrics.length || 1
    const list = Array.from(errorMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        percent: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count)

    return { errorsList: list, failedCount: failed }
  }, [metrics])

  if (metrics.length === 0) return null

  return (
    <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs min-w-0">
      <div className="flex items-center justify-between border-b border-separator-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <RiAlertLine className="size-4 text-text-error-primary" />
          <h4 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.errorDistTitle")}
          </h4>
        </div>
        {failedCount > 0 ? (
          <span className="rounded-md bg-background-tertiary-error/10 px-1.5 py-0.5 font-mono text-caption-2-semibold font-semibold text-text-error-primary dark:text-text-error-primary">
            {failedCount} 次异常
          </span>
        ) : null}
      </div>

      {errorsList.length === 0 ? (
        <div className="my-auto flex flex-col items-center justify-center gap-1.5 py-6 text-center">
          <div className="flex size-7 items-center justify-center rounded-full bg-state-success-text/10 text-state-success-text">
            <RiCheckLine className="size-4" />
          </div>
          <span className="text-caption-2-medium font-medium text-state-success-text dark:text-state-success-text">
            {t("pages.observability.allHealthy")}
          </span>
          <span className="text-caption-2-regular text-text-tertiary">
            {t("pages.observability.allHealthyHint")}
          </span>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2 font-mono text-caption-2-regular">
          {errorsList.map((err) => (
            <div key={err.type} className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span
                  className="font-semibold text-text-error-primary dark:text-text-error-primary truncate text-caption-2-semibold"
                  title={err.type}
                >
                  {err.type}
                </span>
                <span className="text-text-tertiary shrink-0 text-caption-2-regular font-mono whitespace-nowrap">
                  {t("pages.observability.timesPercentSpaced", {
                    n: err.count,
                    percent: err.percent.toFixed(0)
                  })}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-background-secondary-default overflow-hidden">
                <div
                  style={{ width: `${Math.max(err.percent, 3)}%` }}
                  className="h-full bg-background-tertiary-error rounded-full transition-all"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
