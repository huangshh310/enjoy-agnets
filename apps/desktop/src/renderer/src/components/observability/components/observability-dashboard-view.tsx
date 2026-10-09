/**
 * 监控大盘：支持时间范围窗口切片、模型与状态多维联动、KPI 仪表、AI APM 智能洞察与慢调用透视。
 */
import { useMemo, useState } from "react"
import {
  RiCalendarLine,
  RiCloseLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { ObservabilityErrorChart } from "./observability-charts-errors"
import { ObservabilityHistogramChart } from "./observability-charts-histogram"
import { ObservabilityKindChart } from "./observability-charts-kind"
import { ObservabilityModelsChart } from "./observability-charts-models"
import { ObservabilityStatusChart } from "./observability-charts-status"
import { ObservabilityThroughputChart } from "./observability-charts-throughput"
import { ObservabilityTimelineChart } from "./observability-charts-timeline"
import { ObservabilityInsightsCard } from "./observability-insights-card"
import { ObservabilityKpiBar } from "./observability-kpi-bar"
import { ObservabilityPolicyBar } from "./observability-policy-bar"
import { ObservabilitySlowTraces } from "./observability-slow-traces"

type TimeRangeKey = "1h" | "6h" | "24h" | "7d" | "all"
type StatusFilterKey = "all" | "success" | "failed" | "slow"

export function ObservabilityDashboardView(props: {
  metrics: TelemetryMetric[]
  onInspectMetric?: (metric: TelemetryMetric) => void
}) {
  const { metrics, onInspectMetric } = props
  const t = useT()
  const [range, setRange] = useState<TimeRangeKey>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all")
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  const RANGES: Array<{ id: TimeRangeKey; label: string; ms: number }> = [
    { id: "1h", label: t("pages.observability.range1h"), ms: 3600_000 },
    { id: "6h", label: t("pages.observability.range6h"), ms: 6 * 3600_000 },
    { id: "24h", label: t("pages.observability.range24h"), ms: 24 * 3600_000 },
    { id: "7d", label: t("pages.observability.range7d"), ms: 7 * 86400_000 },
    { id: "all", label: t("pages.observability.rangeAll"), ms: Infinity }
  ]

  // 1. 时间范围过滤
  const timeFilteredMetrics = useMemo(() => {
    if (range === "all") return metrics
    const selected = RANGES.find((r) => r.id === range)
    if (!selected || !Number.isFinite(selected.ms)) return metrics
    const threshold = Date.now() - selected.ms
    return metrics.filter((m) => m.createdAt >= threshold)
  }, [metrics, range])

  // 统计不同状态频次（基于时间范围）
  const statusCounts = useMemo(() => {
    let success = 0
    let failed = 0
    let slow = 0
    for (const m of timeFilteredMetrics) {
      const isSuccess = m.status === "success" || m.status === "completed" || m.status === "ok"
      if (isSuccess) success++
      else failed++
      if ((m.durationMs ?? 0) >= 3000) slow++
    }
    return {
      all: timeFilteredMetrics.length,
      success,
      failed,
      slow
    }
  }, [timeFilteredMetrics])

  // 2. 状态与模型联合过滤
  const filteredMetrics = useMemo(() => {
    let result = timeFilteredMetrics

    if (selectedModel) {
      result = result.filter((m) => (m.modelId || "default-model") === selectedModel)
    }

    if (statusFilter === "success") {
      result = result.filter(
        (m) => m.status === "success" || m.status === "completed" || m.status === "ok"
      )
    } else if (statusFilter === "failed") {
      result = result.filter(
        (m) => m.status === "failed" || m.status === "error" || (m.errorClass && m.errorClass !== "ok")
      )
    } else if (statusFilter === "slow") {
      result = result.filter((m) => (m.durationMs ?? 0) >= 3000)
    }

    return result
  }, [timeFilteredMetrics, selectedModel, statusFilter])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 pb-6">
      {/* 顶栏：实时探针状态、快速切片分段器与时间窗口 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-separator-border/70 bg-background-primary-default px-3.5 py-2">
        {/* 左侧：探针状态徽章与采样计数 */}
        <div className="flex flex-wrap items-center gap-2 text-caption-2-medium">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-state-success-text/10 px-2 py-1 font-mono text-caption-2-semibold font-semibold text-state-success-text dark:text-state-success-text">
            <span className="size-1.5 rounded-full bg-state-success-base animate-pulse" />
            <span>本地探针活跃</span>
            <span className="text-state-success-text">·</span>
            <span>100% 采样</span>
          </div>

          <div className="flex items-center gap-1 text-text-tertiary">
            <RiCalendarLine className="size-3.5 text-accent-500" />
            <span>
              {t("pages.observability.rangeShowing", { count: filteredMetrics.length })}
            </span>
          </div>

          {/* 若选中模型过滤，展示撤销胶囊 */}
          {selectedModel ? (
            <button
              type="button"
              onClick={() => setSelectedModel(null)}
              className="inline-flex items-center gap-1 rounded-md bg-accent-500/10 px-2 py-0.5 font-mono text-caption-2-medium font-medium text-accent-600 dark:text-accent-400 hover:bg-accent-500/20 transition-colors"
              title="点击清除该模型筛选"
            >
              <span>模型: {selectedModel}</span>
              <RiCloseLine className="size-3" />
            </button>
          ) : null}
        </div>

        {/* 中右侧：状态快捷过滤胶囊 + 时间窗口分段器 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 状态过滤 */}
          <div className="flex items-center gap-1 rounded-lg bg-background-secondary-default p-0.5 font-mono text-caption-2-regular">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cx(
                "rounded-md px-2 py-1 transition-colors",
                statusFilter === "all"
                  ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-tertiary hover:text-text-primary"
              )}
            >
              全部 ({statusCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("success")}
              className={cx(
                "rounded-md px-2 py-1 transition-colors",
                statusFilter === "success"
                  ? "bg-background-primary-default text-state-success-text dark:text-state-success-text shadow-2xs font-semibold"
                  : "text-text-tertiary hover:text-state-success-text"
              )}
            >
              成功 ({statusCounts.success})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("failed")}
              className={cx(
                "rounded-md px-2 py-1 transition-colors",
                statusFilter === "failed"
                  ? "bg-background-primary-default text-text-error-primary dark:text-text-error-primary shadow-2xs font-semibold"
                  : "text-text-tertiary hover:text-text-error-primary"
              )}
            >
              异常 ({statusCounts.failed})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("slow")}
              className={cx(
                "rounded-md px-2 py-1 transition-colors",
                statusFilter === "slow"
                  ? "bg-background-primary-default text-status-yellow-text dark:text-status-yellow-text shadow-2xs font-semibold"
                  : "text-text-tertiary hover:text-status-yellow-text"
              )}
            >
              慢调用 ({statusCounts.slow})
            </button>
          </div>

          {/* 时间分段器 */}
          <div className="flex items-center gap-1 rounded-lg bg-background-secondary-default p-0.5">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`h-6 rounded-md px-2.5 text-caption-2-medium transition-colors ${
                  range === item.id
                    ? "bg-background-primary-default text-text-primary shadow-2xs font-medium"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
                onClick={() => setRange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. 核心 KPI Bento 仪表盘 */}
      <ObservabilityKpiBar metrics={filteredMetrics} />

      {/* 2. AI APM 智能性能洞察与优化诊断卡片 */}
      <ObservabilityInsightsCard metrics={filteredMetrics} />

      {/* 3. 本地脱敏政策与 OTel / 导出操作栏 */}
      <ObservabilityPolicyBar />

      {/* 4. 核心时序图展台：响应耗时/TTFO 双轨面积图 + Token 细分与 TPS 吞吐复合图 */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        <ObservabilityTimelineChart metrics={filteredMetrics} />
        <ObservabilityThroughputChart metrics={filteredMetrics} />
      </div>

      {/* 5. 多维分布矩阵第一层：模型性能排行 (2 列) + 运行健康度环形图 (1 列) */}
      <div className="grid gap-3.5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ObservabilityModelsChart
            metrics={filteredMetrics}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
          />
        </div>
        <div className="lg:col-span-1">
          <ObservabilityStatusChart metrics={filteredMetrics} />
        </div>
      </div>

      {/* 6. 多维分布矩阵第二层：异常根因排行 + 工作负载场景 + 延迟 SLA 阶梯 */}
      <div className="grid gap-3.5 md:grid-cols-3">
        <ObservabilityErrorChart metrics={filteredMetrics} />
        <ObservabilityKindChart metrics={filteredMetrics} />
        <ObservabilityHistogramChart metrics={filteredMetrics} />
      </div>

      {/* 7. 底部聚焦：慢调用与异常瓶颈透视 + 实时执行流水 (直通火焰图与全景诊断) */}
      <ObservabilitySlowTraces metrics={filteredMetrics} onInspect={onInspectMetric} />
    </div>
  )
}
