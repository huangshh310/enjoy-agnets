/**
 * 可观测性核心性能指标看板 (KPI Dashboard Bar)：
 * 实时聚合统计请求总量、成功率、P50/P95 延迟、首字时间 (TTFO) 与 Token 吞吐率。
 */
import { useMemo } from "react"
import {
  RiFlashlightLine,
  RiPulseLine,
  RiSpeedUpLine,
  RiTimeLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import type { ObservabilityAggregatedStats } from "../types/observability-ui.types"

export function ObservabilityKpiBar(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props
  const t = useT()

  const stats: ObservabilityAggregatedStats = useMemo(() => {
    if (metrics.length === 0) {
      return {
        totalRuns: 0,
        successCount: 0,
        failedCount: 0,
        successRatePercent: 100,
        avgDurationMs: 0,
        p95DurationMs: 0,
        avgTtfoMs: 0,
        totalTokens: 0,
        avgTokensPerSec: 0
      }
    }

    const totalRuns = metrics.length
    const successCount = metrics.filter(
      (m) => m.status === "success" || m.status === "completed" || m.status === "ok"
    ).length
    const failedCount = totalRuns - successCount
    const successRatePercent = totalRuns > 0 ? (successCount / totalRuns) * 100 : 100

    // 耗时排序与统计
    const durations = metrics.map((m) => m.durationMs ?? 0).sort((a, b) => a - b)
    const sumDuration = durations.reduce((acc, v) => acc + v, 0)
    const avgDurationMs = Math.round(sumDuration / totalRuns)
    const p95Index = Math.floor(durations.length * 0.95)
    const p95DurationMs = durations[p95Index] ?? durations[durations.length - 1] ?? 0

    // TTFO 统计
    const ttfos = metrics.map((m) => m.ttfoMs).filter((v): v is number => typeof v === "number" && v > 0)
    const avgTtfoMs =
      ttfos.length > 0 ? Math.round(ttfos.reduce((acc, v) => acc + v, 0) / ttfos.length) : 0

    // Token 与 Throughput
    const totalTokens = metrics.reduce(
      (acc, m) => acc + (m.inputTokens ?? 0) + (m.outputTokens ?? 0),
      0
    )
    const throughputs = metrics
      .map((m) => m.tokensPerSecond)
      .filter((v): v is number => typeof v === "number" && v > 0)
    const avgTokensPerSec =
      throughputs.length > 0
        ? Number((throughputs.reduce((acc, v) => acc + v, 0) / throughputs.length).toFixed(1))
        : 0

    return {
      totalRuns,
      successCount,
      failedCount,
      successRatePercent,
      avgDurationMs,
      p95DurationMs,
      avgTtfoMs,
      totalTokens,
      avgTokensPerSec
    }
  }, [metrics])

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {/* 1. 总调用与成功率 */}
      <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3 shadow-2xs">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-[11px] font-medium">{t("pages.observability.kpiVolume")}</span>
          <RiPulseLine className="size-3.5 text-accent-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-title-3-semibold text-text-primary">
            {stats.totalRuns}
          </span>
          <span
            className={cx(
              "font-mono text-[11px] font-semibold",
              stats.successRatePercent >= 90
                ? "text-emerald-600 dark:text-emerald-400"
                : stats.successRatePercent >= 70
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
            )}
          >
            {t("pages.observability.kpiSuccessPercent", {
              n: stats.successRatePercent.toFixed(1)
            })}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-text-tertiary font-mono">
          <span className="text-emerald-500">
            {t("pages.observability.kpiSuccessCount", { n: stats.successCount })}
          </span>
          <span>·</span>
          <span className={stats.failedCount > 0 ? "text-rose-500" : ""}>
            {t("pages.observability.kpiErrorCount", { n: stats.failedCount })}
          </span>
        </div>
      </div>

      {/* 2. 平均耗时与 P95 */}
      <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3 shadow-2xs">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-[11px] font-medium">{t("pages.observability.kpiDuration")}</span>
          <RiTimeLine className="size-3.5 text-blue-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-title-3-semibold text-text-primary">
            {stats.avgDurationMs >= 1000
              ? `${(stats.avgDurationMs / 1000).toFixed(2)}s`
              : `${stats.avgDurationMs}ms`}
          </span>
          <span className="font-mono text-[11px] text-text-tertiary">
            {t("pages.observability.kpiAvg")}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-text-tertiary font-mono">
          <span>{t("pages.observability.kpiP95")}</span>
          <span className="text-text-secondary font-medium">
            {stats.p95DurationMs >= 1000
              ? `${(stats.p95DurationMs / 1000).toFixed(2)}s`
              : `${stats.p95DurationMs}ms`}
          </span>
        </div>
      </div>

      {/* 3. 首字时间 (TTFO) */}
      <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3 shadow-2xs">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-[11px] font-medium">{t("pages.observability.kpiTtfo")}</span>
          <RiFlashlightLine className="size-3.5 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-title-3-semibold text-text-primary">
            {stats.avgTtfoMs > 0 ? `${stats.avgTtfoMs}ms` : "—"}
          </span>
          <span className="font-mono text-[11px] text-text-tertiary">
            {t("pages.observability.kpiTtfoShort")}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-text-tertiary font-mono">
          {t("pages.observability.kpiTtfoHint")}
        </div>
      </div>

      {/* 4. Token 吞吐率 */}
      <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3 shadow-2xs">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-[11px] font-medium">{t("pages.observability.kpiThroughput")}</span>
          <RiSpeedUpLine className="size-3.5 text-purple-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-title-3-semibold text-text-primary">
            {stats.avgTokensPerSec > 0 ? `${stats.avgTokensPerSec}` : "—"}
          </span>
          <span className="font-mono text-[11px] text-text-tertiary">
            {t("pages.observability.kpiToks")}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-text-tertiary font-mono">
          {t("pages.observability.kpiTotalTokens", { n: stats.totalTokens.toLocaleString() })}
        </div>
      </div>
    </div>
  )
}
