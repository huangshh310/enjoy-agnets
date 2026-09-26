/**
 * 可观测性核心性能指标看板 (KPI Dashboard Bar)：
 * 实时聚合统计请求总量、成功率、P50/P95 延迟、首字时间 (TTFO) 与 Token 吞吐率，
 * 搭配各维度原生 SVG Sparkline 迷你走势曲线与 Bento 微渐变风格。
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
import { formatLatency } from "./model-routing/model-routing-row-cells"
import { formatTokens } from "@renderer/components/settings/agent-tools/format-spend"

export function ObservabilityKpiBar(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props
  const t = useT()

  const { stats, sparklines } = useMemo(() => {
    if (metrics.length === 0) {
      return {
        stats: {
          totalRuns: 0,
          successCount: 0,
          failedCount: 0,
          successRatePercent: 100,
          avgDurationMs: 0,
          p50DurationMs: 0,
          p95DurationMs: 0,
          maxDurationMs: 0,
          avgTtfoMs: 0,
          p95TtfoMs: 0,
          totalTokens: 0,
          totalPromptTokens: 0,
          totalCompletionTokens: 0,
          avgTokensPerSec: 0,
          peakTokensPerSec: 0
        },
        sparklines: {
          volume: [],
          duration: [],
          ttfo: [],
          throughput: []
        }
      }
    }

    const sorted = [...metrics].sort((a, b) => a.createdAt - b.createdAt)
    const totalRuns = sorted.length
    const successCount = sorted.filter(
      (m) => m.status === "success" || m.status === "completed" || m.status === "ok"
    ).length
    const failedCount = totalRuns - successCount
    const successRatePercent = totalRuns > 0 ? (successCount / totalRuns) * 100 : 100

    // 耗时排序与统计
    const durations = sorted.map((m) => m.durationMs ?? 0).sort((a, b) => a - b)
    const sumDuration = durations.reduce((acc, v) => acc + v, 0)
    const avgDurationMs = Math.round(sumDuration / totalRuns)
    const p50Index = Math.floor(durations.length * 0.5)
    const p50DurationMs = durations[p50Index] ?? 0
    const p95Index = Math.floor(durations.length * 0.95)
    const p95DurationMs = durations[p95Index] ?? durations[durations.length - 1] ?? 0
    const maxDurationMs = durations[durations.length - 1] ?? 0

    // TTFO 统计
    const ttfos = sorted
      .map((m) => m.ttfoMs)
      .filter((v): v is number => typeof v === "number" && v > 0)
      .sort((a, b) => a - b)
    const avgTtfoMs =
      ttfos.length > 0 ? Math.round(ttfos.reduce((acc, v) => acc + v, 0) / ttfos.length) : 0
    const p95TtfoIdx = Math.floor(ttfos.length * 0.95)
    const p95TtfoMs = ttfos[p95TtfoIdx] ?? ttfos[ttfos.length - 1] ?? 0

    // Token 与 Throughput
    const totalPromptTokens = sorted.reduce((acc, m) => acc + (m.inputTokens ?? 0), 0)
    const totalCompletionTokens = sorted.reduce((acc, m) => acc + (m.outputTokens ?? 0), 0)
    const totalTokens = totalPromptTokens + totalCompletionTokens

    const throughputs = sorted
      .map((m) => m.tokensPerSecond)
      .filter((v): v is number => typeof v === "number" && v > 0)
    const avgTokensPerSec =
      throughputs.length > 0
        ? Number((throughputs.reduce((acc, v) => acc + v, 0) / throughputs.length).toFixed(1))
        : 0
    const peakTokensPerSec = throughputs.length > 0 ? Number(Math.max(...throughputs).toFixed(1)) : 0

    // 提取 Sparkline 走势序列（最近至多 24 点）
    const sampleWindow = sorted.slice(-24)
    const sparkVolume = sampleWindow.map((_, i) => i + 1)
    const sparkDuration = sampleWindow.map((m) => m.durationMs ?? 0)
    const sparkTtfo = sampleWindow.map((m) => m.ttfoMs ?? 0)
    const sparkThroughput = sampleWindow.map((m) => m.tokensPerSecond ?? 0)

    return {
      stats: {
        totalRuns,
        successCount,
        failedCount,
        successRatePercent,
        avgDurationMs,
        p50DurationMs,
        p95DurationMs,
        maxDurationMs,
        avgTtfoMs,
        p95TtfoMs,
        totalTokens,
        totalPromptTokens,
        totalCompletionTokens,
        avgTokensPerSec,
        peakTokensPerSec
      },
      sparklines: {
        volume: sparkVolume,
        duration: sparkDuration,
        ttfo: sparkTtfo,
        throughput: sparkThroughput
      }
    }
  }, [metrics])

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* 1. 总调用与成功率 */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs transition-all hover:border-accent-500/40">
        <div>
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-caption-2-medium font-medium">{t("pages.observability.kpiVolume")}</span>
            <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
              <RiPulseLine className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-title-3-semibold font-bold text-text-primary">
              {stats.totalRuns}
            </span>
            <span
              className={cx(
                "rounded px-1.5 py-0.5 font-mono text-caption-2-semibold font-semibold",
                stats.successRatePercent >= 90
                  ? "bg-chart-success/15 text-chart-success-text"
                  : stats.successRatePercent >= 70
                    ? "bg-chart-warning/15 text-chart-warning-text"
                    : "bg-chart-danger/15 text-chart-danger-text"
              )}
            >
              {stats.successRatePercent.toFixed(1)}% 成功
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-caption-2-regular text-text-tertiary font-mono">
            <span className="text-chart-success-text font-medium">
              ✓ {stats.successCount} 成功
            </span>
            <span>·</span>
            <span className={stats.failedCount > 0 ? "text-chart-danger-text font-medium" : ""}>
              ✕ {stats.failedCount} 异常
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-1">
          <Sparkline
            data={sparklines.volume}
            stroke="var(--color-accent-500)"
            fill="var(--color-accent-500)"
          />
        </div>
      </div>

      {/* 2. 平均耗时与 P50/P95 分位数 */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs transition-all hover:border-chart-6/40">
        <div>
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-caption-2-medium font-medium">{t("pages.observability.kpiDuration")}</span>
            <div className="flex size-6 items-center justify-center rounded-lg bg-chart-6/15 text-chart-6">
              <RiTimeLine className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-title-3-semibold font-bold text-text-primary">
              {stats.avgDurationMs >= 1000
                ? `${(stats.avgDurationMs / 1000).toFixed(2)}s`
                : `${stats.avgDurationMs}ms`}
            </span>
            <span className="font-mono text-caption-2-regular text-text-tertiary">
              {t("pages.observability.kpiAvg")}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-caption-2-regular text-text-tertiary font-mono">
            <span>P50:</span>
            <span className="text-text-secondary font-medium">
              {formatLatency(stats.p50DurationMs)}
            </span>
            <span>·</span>
            <span>P95:</span>
            <span className="text-text-secondary font-medium">
              {formatLatency(stats.p95DurationMs)}
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-1">
          <Sparkline
            data={sparklines.duration}
            stroke="var(--color-chart-6)"
            fill="var(--color-chart-6)"
          />
        </div>
      </div>

      {/* 3. 首字延迟 (TTFO) */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs transition-all hover:border-chart-warning/40">
        <div>
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-caption-2-medium font-medium">{t("pages.observability.kpiTtfo")}</span>
            <div className="flex size-6 items-center justify-center rounded-lg bg-chart-warning/15 text-chart-warning-text">
              <RiFlashlightLine className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-title-3-semibold font-bold text-chart-warning-text">
              {stats.avgTtfoMs > 0 ? formatLatency(stats.avgTtfoMs) : "—"}
            </span>
            <span className="font-mono text-caption-2-regular text-text-tertiary">
              均值
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-caption-2-regular text-text-tertiary font-mono">
            {stats.p95TtfoMs > 0 ? (
              <>
                <span>P95:</span>
                <span className="text-text-secondary font-medium">{formatLatency(stats.p95TtfoMs)}</span>
                <span>·</span>
              </>
            ) : null}
            <span className="truncate">流式思考首包</span>
          </div>
        </div>

        <div className="mt-2.5 pt-1">
          <Sparkline
            data={sparklines.ttfo}
            stroke="var(--color-chart-warning)"
            fill="var(--color-chart-warning)"
          />
        </div>
      </div>

      {/* 4. Token 吞吐与规模 */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs transition-all hover:border-chart-success/40">
        <div>
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-caption-2-medium font-medium">{t("pages.observability.kpiThroughput")}</span>
            <div className="flex size-6 items-center justify-center rounded-lg bg-chart-success/15 text-chart-success-text">
              <RiSpeedUpLine className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-title-3-semibold font-bold text-chart-success-text">
              {stats.avgTokensPerSec > 0 ? `${stats.avgTokensPerSec}` : "—"}
            </span>
            <span className="font-mono text-caption-2-regular text-text-tertiary">
              tok/s
            </span>
            {stats.peakTokensPerSec > 0 ? (
              <span className="rounded bg-chart-success/15 px-1 py-0.5 font-mono text-caption-2-regular text-chart-success-text">
                峰值 {stats.peakTokensPerSec}
              </span>
            ) : null}
          </div>
          <div
            className="mt-1.5 text-caption-2-regular text-text-tertiary font-mono truncate"
            title={`总计 ${stats.totalTokens.toLocaleString()} (入: ${formatTokens(stats.totalPromptTokens)} / 出: ${formatTokens(stats.totalCompletionTokens)})`}
          >
            总计 {formatTokens(stats.totalTokens)} (入 {formatTokens(stats.totalPromptTokens)} / 出 {formatTokens(stats.totalCompletionTokens)})
          </div>
        </div>

        <div className="mt-2.5 pt-1">
          <Sparkline
            data={sparklines.throughput}
            stroke="var(--color-chart-success)"
            fill="var(--color-chart-success)"
          />
        </div>
      </div>
    </div>
  )
}

/** 轻量原生 SVG 平滑 Sparkline 走势图 */
function Sparkline({
  data,
  stroke,
  fill,
  height = 26
}: {
  data: number[]
  stroke: string
  fill: string
  height?: number
}) {
  if (data.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-caption-2-regular text-text-tertiary/40">
        • • •
      </div>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data, min + 1)
  const range = max - min
  const width = 140
  const pad = 2

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width
    const y = height - pad - ((val - min) / range) * (height - pad * 2)
    return { x, y }
  })

  let pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const midX = ((prev.x + curr.x) / 2).toFixed(1)
    pathD += ` C ${midX} ${prev.y.toFixed(1)}, ${midX} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`
  }

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-6.5 w-full overflow-hidden" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${stroke.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.25" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${stroke.replace(/[^a-zA-Z0-9]/g, "")})`} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
