/**
 * 全景 Trace 双栏深度工作台 (Full Trace Span Workbench)：
 * 整合顶部摘要看板、左侧 Span 树状甘特瀑布流与右侧实时联动检查器。
 */
import { useEffect, useState } from "react"
import { getIde } from "@renderer/lib/ide"
import {
  buildTraceDataFromMetric,
  type TraceReplayEvent
} from "../../services/trace-tree-builder"
import type { SpanNode } from "../../types/trace-span.types"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { SpanDetailInspector } from "./span-detail-inspector"
import { TraceSummaryHeader } from "./trace-summary-header"
import { TraceWaterfallTree } from "./trace-waterfall-tree"

export function FullTraceWorkbench(props: {
  metric: TelemetryMetric
  onBack: () => void
}) {
  const { metric, onBack } = props
  const [events, setEvents] = useState<TraceReplayEvent[]>([])
  const traceData = buildTraceDataFromMetric(metric, undefined, events)
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

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. 顶部摘要指标看板 */}
      <TraceSummaryHeader data={traceData} onBack={onBack} />

      {/* 2. 下方双栏核心追踪工作台 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* 左侧 7 列: Span 树状时序图与甘特瀑布流 */}
        <div className="lg:col-span-7">
          <TraceWaterfallTree
            rootSpan={traceData.rootSpan}
            totalDurationMs={traceData.totalDurationMs}
            selectedSpanId={selectedSpan.id}
            onSelectSpan={(s) => setSelectedSpan(s)}
          />
        </div>

        {/* 右侧 5 列: 选定 Span 联动检查器 (Input/Output & Attributes) */}
        <div className="lg:col-span-5">
          <SpanDetailInspector span={selectedSpan} />
        </div>
      </div>
    </div>
  )
}
