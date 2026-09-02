/**
 * Span 树状时序图与耗时甘特瀑布流 (Trace Waterfall Tree & Gantt Bar Chart)：
 * 支持多层级树展开折叠、时序标尺刻度、类型彩色徽标与点击联动高亮。
 */
import { useState } from "react"
import {
  RiArrowDownSLine,
  RiArrowRightSLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { getSpanKindConfig } from "../../services/span-kind-config"
import type { SpanNode } from "../../types/trace-span.types"

export function TraceWaterfallTree(props: {
  rootSpan: SpanNode
  totalDurationMs: number
  selectedSpanId: string
  onSelectSpan: (span: SpanNode) => void
}) {
  const { rootSpan, totalDurationMs, selectedSpanId, onSelectSpan } = props
  const t = useT()
  const kinds = getSpanKindConfig(t)
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({})

  function toggleCollapse(id: string) {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // 扁平化展示树节点
  function flattenSpans(node: SpanNode, depth = 0): Array<{ node: SpanNode; depth: number }> {
    const list: Array<{ node: SpanNode; depth: number }> = [{ node, depth }]
    const isCollapsed = Boolean(collapsedIds[node.id])
    if (!isCollapsed && node.children && node.children.length > 0) {
      for (const child of node.children) {
        list.push(...flattenSpans(child, depth + 1))
      }
    }
    return list
  }

  const allRows = flattenSpans(rootSpan)
  const maxTime = Math.max(totalDurationMs, 100)

  // 标尺刻度点 (0ms, 25%, 50%, 75%, 100%)
  const rulerTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => {
    const val = Math.round(maxTime * r)
    return {
      ratio: r,
      label: val >= 1000 ? `${(val / 1000).toFixed(1)}s` : `${val}ms`
    }
  })

  return (
    <div className="flex flex-col rounded-xl border border-separator-border/70 bg-background-primary-default overflow-hidden shadow-2xs font-mono text-[11px]">
      {/* 1. 图例标签栏 (Legend) */}
      <div className="flex items-center gap-3 bg-background-secondary-default/40 px-4 py-2 border-b border-separator-border/60 overflow-x-auto whitespace-nowrap text-[10.5px]">
        {Object.entries(kinds).map(([k, cfg]) => (
          <div key={k} className="flex items-center gap-1.5 shrink-0">
            <span style={{ backgroundColor: cfg.color }} className="size-2 rounded-full" />
            <span className="text-text-secondary font-medium">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* 2. 表头与时间刻度标尺 (Time Axis Ruler) */}
      <div className="grid grid-cols-12 bg-background-secondary-default/70 px-4 py-2 font-semibold text-text-tertiary border-b border-separator-border/60 items-center">
        <div className="col-span-4 truncate">Span (调用跨度)</div>
        <div className="col-span-3 truncate">Operation / Target</div>
        {/* 右侧 5 列为时间轴标尺 */}
        <div className="col-span-5 relative h-4 flex items-center">
          {rulerTicks.map((t, idx) => (
            <span
              key={idx}
              style={{ left: `${t.ratio * 92}%` }}
              className="absolute text-[9.5px] text-text-tertiary -translate-x-1/2 select-none"
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* 3. 树状时序 Gantt 列表 */}
      <div className="divide-y divide-separator-border/40 overflow-y-auto max-h-[60vh]">
        {allRows.map(({ node, depth }) => {
          const isSelected = selectedSpanId === node.id
          const hasChildren = Boolean(node.children && node.children.length > 0)
          const isCollapsed = Boolean(collapsedIds[node.id])
          const cfg = kinds[node.kind] ?? kinds.agent

          // 计算 Gantt 条的水平起点与宽度比例
          const leftPercent = Math.min((node.startOffsetMs / maxTime) * 100, 95)
          const widthPercent = Math.max(Math.min((node.durationMs / maxTime) * 100, 100 - leftPercent), 4)

          return (
            <div
              key={node.id}
              onClick={() => onSelectSpan(node)}
              className={cx(
                "grid grid-cols-12 px-4 py-2.5 items-center transition-colors cursor-pointer",
                isSelected
                  ? "bg-accent-500/10 border-l-2 border-l-accent-500 font-semibold"
                  : "hover:bg-background-secondary-hover/40"
              )}
            >
              {/* Span 树层级名称 */}
              <div className="col-span-4 flex items-center gap-1 min-w-0 pr-2">
                <div style={{ width: `${depth * 14}px` }} className="shrink-0" />

                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCollapse(node.id)
                    }}
                    className="p-0.5 text-text-tertiary hover:text-text-primary"
                  >
                    {isCollapsed ? (
                      <RiArrowRightSLine className="size-3.5" />
                    ) : (
                      <RiArrowDownSLine className="size-3.5" />
                    )}
                  </button>
                ) : (
                  <div className="w-4 shrink-0" />
                )}

                {/* 类别圆点 */}
                <span
                  style={{ backgroundColor: cfg.color }}
                  className="size-2 rounded-full shrink-0 mr-1"
                />

                <span className="truncate text-text-primary">{node.name}</span>

                {node.status === "error" ? (
                  <span className="rounded bg-rose-500/10 px-1 py-0.2 text-[8.5px] font-bold text-rose-600 dark:text-rose-400 shrink-0">
                    ERR
                  </span>
                ) : null}
              </div>

              {/* Operation 标签 */}
              <div className="col-span-3 text-text-secondary truncate pr-2">
                <span className="text-[10px] text-text-tertiary">
                  {node.operation} {node.model ? `· ${node.model}` : ""}
                </span>
              </div>

              {/* 右侧 Gantt 水平时序条 */}
              <div className="col-span-5 relative h-5 flex items-center">
                {/* 耗时条 */}
                <div
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    backgroundColor: node.status === "error" ? "#f43f5e" : cfg.color
                  }}
                  className="h-3.5 rounded-sm flex items-center justify-end px-1 text-[9.5px] font-bold text-white shadow-2xs transition-all select-none overflow-hidden"
                  title={`${node.name}: ${node.durationMs}ms (offset: ${node.startOffsetMs}ms)`}
                >
                  <span className="truncate drop-shadow-sm">{node.durationMs}ms</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
