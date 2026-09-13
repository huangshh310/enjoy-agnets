/**
 * 全景 Trace 深度诊断工作台 (Full Trace Diagnostic Workbench)：
 * 整合顶部指标看板、视角切换（Span 甘特瀑布流 / Flame Chart 火焰图时间线 / OTel 属性 / 原始 JSON）
 * 与右侧实时联动检查器 (SpanDetailInspector)。
 */
import { useEffect, useState } from "react"
import {
  RiBarChartHorizontalLine,
  RiCodeSSlashLine,
  RiFileList2Line,
  RiFireLine
} from "@remixicon/react"
import { getIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import {
  buildTraceDataFromMetric,
  type TraceReplayEvent
} from "../../services/trace-tree-builder"
import type { SpanNode } from "../../types/trace-span.types"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { getTraceOtelRows } from "../observability-trace-copy"
import { ObservabilityTraceAttributes, ObservabilityTraceJson } from "../observability-trace-panels"
import { SpanDetailInspector } from "./span-detail-inspector"
import { TraceFlameChart } from "./trace-flame-chart"
import { TraceSummaryHeader } from "./trace-summary-header"
import { TraceWaterfallTree } from "./trace-waterfall-tree"

type TraceViewMode = "waterfall" | "flame" | "attributes" | "raw"

export function FullTraceWorkbench(props: {
  metric: TelemetryMetric
  onBack: () => void
}) {
  const { metric, onBack } = props
  const t = useT()
  const [viewMode, setViewMode] = useState<TraceViewMode>("waterfall")
  const [events, setEvents] = useState<TraceReplayEvent[]>([])
  const traceData = buildTraceDataFromMetric(metric, t, events)
  const [selectedSpan, setSelectedSpan] = useState<SpanNode>(traceData.rootSpan)

  useEffect(() => {
    let cancelled = false
    void getIde()
      .observability.replay({ runId: metric.runId, limit: 200 })
      .then((rows) => {
        if (!cancelled && Array.isArray(rows)) setEvents(rows as TraceReplayEvent[])
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })
    return () => {
      cancelled = true
    }
  }, [metric.runId])

  useEffect(() => {
    setSelectedSpan(traceData.rootSpan)
  }, [metric.id, events])

  const duration = metric.durationMs ?? 0
  const ttfo = metric.ttfoMs ?? 0
  const inTok = metric.inputTokens ?? 0
  const outTok = metric.outputTokens ?? 0
  const timeFormatted = new Date(metric.createdAt).toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
  const rawJson = JSON.stringify(metric, null, 2)
  const otelAttributes = getTraceOtelRows(metric, t, {
    duration,
    ttfo,
    inTok,
    outTok,
    totalTokens: inTok + outTok,
    timeFormatted
  })

  const MODES: Array<{ id: TraceViewMode; label: string; icon: typeof RiBarChartHorizontalLine }> = [
    { id: "waterfall", label: "Span 甘特树 (Waterfall)", icon: RiBarChartHorizontalLine },
    { id: "flame", label: "火焰图时间线 (Flame Chart)", icon: RiFireLine },
    { id: "attributes", label: "OTel 属性表 (Attributes)", icon: RiFileList2Line },
    { id: "raw", label: "原始载荷 (Raw JSON)", icon: RiCodeSSlashLine }
  ]

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* 1. 顶部全景指标看板 */}
      <TraceSummaryHeader data={traceData} onBack={onBack} />

      {/* 2. 诊断视角模式切换导轨 */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-separator-border/70 bg-background-primary-default px-3.5 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-background-secondary-default p-0.5">
          {MODES.map((mode) => {
            const Icon = mode.icon
            const isActive = viewMode === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                className={`flex items-center gap-1.5 h-6 rounded-md px-2.5 font-mono text-[11px] transition-colors ${
                  isActive
                    ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
                onClick={() => setViewMode(mode.id)}
              >
                <Icon className={`size-3.5 ${isActive ? "text-accent-500" : ""}`} />
                <span>{mode.label}</span>
              </button>
            )
          })}
        </div>

        <span className="font-mono text-[10.5px] text-text-tertiary">
          {traceData.totalSpans} 个 Span 阶段 · Run {metric.runId.slice(0, 14)}
        </span>
      </div>

      {/* 3. 核心视图展示区 */}
      {viewMode === "waterfall" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-7 min-w-0">
            <TraceWaterfallTree
              rootSpan={traceData.rootSpan}
              totalDurationMs={traceData.totalDurationMs}
              selectedSpanId={selectedSpan.id}
              onSelectSpan={(s) => setSelectedSpan(s)}
            />
          </div>
          <div className="lg:col-span-5 min-w-0">
            <SpanDetailInspector span={selectedSpan} />
          </div>
        </div>
      ) : null}

      {viewMode === "flame" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-7 min-w-0">
            <TraceFlameChart
              rootSpan={traceData.rootSpan}
              totalDurationMs={traceData.totalDurationMs}
              selectedSpanId={selectedSpan.id}
              onSelectSpan={(s) => setSelectedSpan(s)}
            />
          </div>
          <div className="lg:col-span-5 min-w-0">
            <SpanDetailInspector span={selectedSpan} />
          </div>
        </div>
      ) : null}

      {viewMode === "attributes" ? (
        <div className="min-w-0">
          <ObservabilityTraceAttributes rows={otelAttributes} />
        </div>
      ) : null}

      {viewMode === "raw" ? (
        <div className="min-w-0">
          <ObservabilityTraceJson rawJson={rawJson} />
        </div>
      ) : null}
    </div>
  )
}
