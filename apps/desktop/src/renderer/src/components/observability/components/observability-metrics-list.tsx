/**
 * 可观测性链路明细日志数据表格 (APM Traces Data Grid)：
 * 宽屏自适应高密度表格架构，平衡展示状态、工作负载、模型、耗时进度条、TTFO、Token 细分与操作。
 */
import {
  RiCheckLine,
  RiCloseLine,
  RiEyeLine,
  RiFlashlightLine,
  RiLoader4Line,
  RiPulseLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"

export function ObservabilityMetricsList(props: {
  metrics: TelemetryMetric[]
  onInspect: (metric: TelemetryMetric) => void
}) {
  const { metrics, onInspect } = props
  const t = useT()

  if (metrics.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-separator-border/80 bg-background-secondary-default/20 p-10 text-center">
        <RiPulseLine className="size-8 text-text-tertiary mb-2" />
        <h4 className="text-caption-1-medium font-semibold text-text-primary">
          {t("pages.observability.emptyTraces")}
        </h4>
        <p className="mt-1 max-w-sm text-caption-2-medium text-text-tertiary">
          {t("pages.observability.emptyTracesHint")}
        </p>
      </div>
    )
  }

  const maxDuration = Math.max(...metrics.map((m) => m.durationMs ?? 0), 1000)

  return (
    <div className="flex flex-col rounded-xl border border-separator-border/70 bg-background-primary-default overflow-hidden shadow-2xs font-mono text-caption-2-regular">
      {/* 表头 */}
      <div className="hidden md:grid grid-cols-12 gap-2 bg-background-secondary-default/60 px-3.5 py-2 text-text-tertiary font-semibold border-b border-separator-border/60">
        <div className="col-span-3">{t("pages.observability.colWorkload")}</div>
        <div className="col-span-3">{t("pages.observability.colModel")}</div>
        <div className="col-span-2">{t("pages.observability.colDuration")}</div>
        <div className="col-span-1">{t("pages.observability.colTtfo")}</div>
        <div className="col-span-1">{t("pages.observability.colTokens")}</div>
        <div className="col-span-1">{t("pages.observability.colRate")}</div>
        <div className="col-span-1 text-right">{t("pages.observability.colTime")}</div>
      </div>

      {/* 行记录列表 */}
      <div className="divide-y divide-separator-border/40">
        {metrics.map((metric) => {
          const isSuccess =
            metric.status === "success" || metric.status === "completed" || metric.status === "ok"
          const isRunning = metric.status === "running"

          const duration = metric.durationMs ?? 0
          const durationFormatted =
            duration >= 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`
          const durationRatio = Math.min((duration / maxDuration) * 100, 100)

          const inTok = metric.inputTokens ?? 0
          const outTok = metric.outputTokens ?? 0

          const timeFormatted = new Date(metric.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          })

          return (
            <div
              key={metric.id}
              onClick={() => onInspect(metric)}
              className="group grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center px-3.5 py-2.5 hover:bg-background-secondary-hover/40 transition-colors cursor-pointer"
            >
              {/* 1. 工作负载 & 状态 */}
              <div className="md:col-span-3 flex items-center gap-2 min-w-0">
                <div
                  className={cx(
                    "flex size-5 shrink-0 items-center justify-center rounded border",
                    isSuccess
                      ? "border-state-success-text/20 bg-state-success-text/10 text-state-success-text dark:text-state-success-text"
                      : isRunning
                        ? "border-accent-500/20 bg-accent-500/10 text-accent-500 dark:text-accent-500"
                        : "border-border-error-default/20 bg-background-tertiary-error/10 text-text-error-primary dark:text-text-error-primary"
                  )}
                >
                  {isSuccess ? (
                    <RiCheckLine className="size-3" />
                  ) : isRunning ? (
                    <RiLoader4Line className="size-3 animate-spin" />
                  ) : (
                    <RiCloseLine className="size-3" />
                  )}
                </div>

                <span className="rounded bg-background-secondary-default px-1.5 py-0.2 text-caption-2-bold font-bold uppercase text-text-secondary">
                  {metric.kind}
                </span>

                <span
                  className={cx(
                    "rounded px-1.5 py-0.2 text-caption-2-semibold uppercase font-semibold",
                    isSuccess
                      ? "text-state-success-text dark:text-state-success-text"
                      : isRunning
                        ? "text-accent-500 dark:text-accent-500"
                        : "bg-background-tertiary-error/10 text-text-error-primary dark:text-text-error-primary"
                  )}
                >
                  {metric.status}
                </span>

                {metric.errorClass && metric.errorClass !== "ok" ? (
                  <span className="rounded bg-background-tertiary-error/10 px-1 py-0.2 text-caption-2-semibold font-semibold text-text-error-primary dark:text-text-error-primary truncate">
                    {metric.errorClass}
                  </span>
                ) : null}
              </div>

              {/* 2. 模型 & Run ID */}
              <div className="md:col-span-3 flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ModelBrandIcon modelId={metric.modelId} size={14} className="shrink-0" />
                  <span className="font-semibold text-text-primary truncate" title={metric.modelId ?? "default-model"}>
                    {metric.modelId ?? "default-model"}
                  </span>
                </div>
                <span className="text-caption-2-regular text-text-tertiary truncate">
                  {t("pages.observability.runId", { id: metric.runId.slice(0, 14) })}
                </span>
              </div>

              {/* 3. 响应耗时与 Sparkline 进度 */}
              <div className="md:col-span-2 flex flex-col gap-0.5">
                <span className="font-semibold text-text-primary">{durationFormatted}</span>
                <div className="h-1 w-24 rounded-full bg-background-secondary-default overflow-hidden">
                  <div
                    style={{ width: `${Math.max(durationRatio, 4)}%` }}
                    className={cx(
                      "h-full rounded-full transition-all",
                      isSuccess ? "bg-accent-500" : "bg-background-tertiary-error"
                    )}
                  />
                </div>
              </div>

              {/* 4. 首字延迟 TTFO */}
              <div className="md:col-span-1">
                {metric.ttfoMs ? (
                  <span className="inline-flex items-center gap-0.5 text-accent-600 dark:text-accent-400 font-medium">
                    <RiFlashlightLine className="size-2.5" />
                    <span>{metric.ttfoMs}ms</span>
                  </span>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </div>

              {/* 5. Token 消耗 */}
              <div className="md:col-span-1 text-text-secondary">
                {inTok + outTok > 0 ? (
                  <span>{inTok + outTok}</span>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </div>

              {/* 6. 速率 */}
              <div className="md:col-span-1">
                {metric.tokensPerSecond ? (
                  <span className="text-chart-5 dark:text-chart-5 font-medium">
                    {metric.tokensPerSecond.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </div>

              {/* 7. 时间与查看操作 */}
              <div className="md:col-span-1 flex items-center justify-between md:justify-end gap-2 text-text-tertiary">
                <span className="text-caption-2-regular">{timeFormatted}</span>
                <RiEyeLine className="size-3.5 group-hover:text-accent-500 transition-colors" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
