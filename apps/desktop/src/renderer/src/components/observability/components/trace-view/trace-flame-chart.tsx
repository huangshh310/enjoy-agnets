/**
 * Trace 火焰图时间线 (Flame Chart Timeline)：
 * X 轴 = 绝对时间 (ms)，Y 轴 = 调用栈深度 (Call Stack Depth)；
 * 每一块代表一个调用帧/Span，父在上子在下，先后左右排布。
 * 支持点击选定 Span 联动检查器、悬停详细 Tooltip 与时间刻度标尺。
 */
import { useMemo, useState } from "react"
import { RiFireLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { getSpanKindConfig } from "../../services/span-kind-config"
import type { SpanNode } from "../../types/trace-span.types"

interface FlameFrame {
  node: SpanNode
  depth: number
  leftPercent: number
  widthPercent: number
}

export function TraceFlameChart(props: {
  rootSpan: SpanNode
  totalDurationMs: number
  selectedSpanId: string
  onSelectSpan: (span: SpanNode) => void
}) {
  const { rootSpan, totalDurationMs, selectedSpanId, onSelectSpan } = props
  const t = useT()
  const kinds = getSpanKindConfig(t)
  const [hoveredNode, setHoveredNode] = useState<SpanNode | null>(null)

  const maxTime = Math.max(totalDurationMs, 10)

  // 构建各深度的帧层级
  const { layers, maxDepth } = useMemo(() => {
    const layerMap = new Map<number, FlameFrame[]>()
    let deepest = 0

    function traverse(node: SpanNode, depth: number) {
      if (depth > deepest) deepest = depth
      const left = Math.min((node.startOffsetMs / maxTime) * 100, 99)
      const rawWidth = (node.durationMs / maxTime) * 100
      const width = Math.max(Math.min(rawWidth, 100 - left), 1.2)

      const list = layerMap.get(depth) ?? []
      list.push({ node, depth, leftPercent: left, widthPercent: width })
      layerMap.set(depth, list)

      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          traverse(child, depth + 1)
        }
      }
    }

    traverse(rootSpan, 0)

    const result: Array<{ depth: number; frames: FlameFrame[] }> = []
    for (let d = 0; d <= deepest; d++) {
      result.push({ depth: d, frames: layerMap.get(d) ?? [] })
    }

    return { layers: result, maxDepth: deepest }
  }, [rootSpan, maxTime])

  // 时间刻度标尺 (0%, 25%, 50%, 75%, 100%)
  const rulerTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const val = Math.round(maxTime * ratio)
      return {
        ratio,
        label: val >= 1000 ? `${(val / 1000).toFixed(2)}s` : `${val}ms`
      }
    })
  }, [maxTime])

  return (
    <div className="flex flex-col rounded-xl border border-separator-border/70 bg-background-primary-default shadow-2xs font-mono text-[11px] overflow-hidden min-h-[360px] h-full">
      {/* 1. 图例与模式说明栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator-border/60 bg-background-secondary-default/30 px-3.5 py-2 text-[10.5px]">
        <div className="flex items-center gap-2">
          <RiFireLine className="size-3.5 text-amber-500 shrink-0" />
          <span className="font-semibold text-text-primary">Flame Chart 时间线</span>
          <span className="text-text-tertiary">· X 轴时间 · Y 轴调用深度 ({maxDepth + 1} 层)</span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto">
          {Object.entries(kinds).slice(0, 5).map(([k, cfg]) => (
            <div key={k} className="flex items-center gap-1 shrink-0">
              <span style={{ backgroundColor: cfg.color }} className="size-2 rounded-full" />
              <span className="text-text-secondary">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 时间轴标尺 (Ruler) */}
      <div className="relative h-6 border-b border-separator-border/60 bg-background-secondary-default/50 px-4">
        {rulerTicks.map((tick, idx) => (
          <div
            key={idx}
            style={{ left: `${tick.ratio * 96 + 2}%` }}
            className="absolute top-0 flex flex-col items-center -translate-x-1/2 select-none"
          >
            <div className="h-1.5 w-px bg-separator-border" />
            <span className="text-[9.5px] text-text-tertiary">{tick.label}</span>
          </div>
        ))}
      </div>

      {/* 3. 火焰图主堆叠画板 (Frames Stack) */}
      <div className="relative min-h-[14rem] overflow-x-auto p-4 flex flex-col gap-2 bg-background-primary-default/60">
        {/* 背景垂直网格刻度虚线 */}
        <div className="pointer-events-none absolute inset-0 px-4">
          {rulerTicks.map((tick, idx) => (
            <div
              key={idx}
              style={{ left: `${tick.ratio * 96 + 2}%` }}
              className="absolute inset-y-0 w-px border-r border-dashed border-separator-border/30"
            />
          ))}
        </div>

        {layers.map(({ depth, frames }) => (
          <div key={depth} className="relative h-7 w-full">
            {/* 深度标签 */}
            <span className="absolute -left-2.5 top-1 font-mono text-[9px] text-text-tertiary select-none">
              D{depth}
            </span>

            {frames.map(({ node, leftPercent, widthPercent }) => {
              const isSelected = selectedSpanId === node.id
              const isHovered = hoveredNode?.id === node.id
              const cfg = kinds[node.kind] ?? kinds.agent
              const isError = node.status === "error"
              const frameBg = isError ? "#f43f5e" : cfg.color

              return (
                <div
                  key={node.id}
                  className={cx(
                    "absolute top-0 h-6.5 rounded-md px-1.5 py-0.5 transition-all cursor-pointer select-none",
                    "flex items-center justify-between overflow-hidden shadow-2xs border text-[10px]",
                    isSelected
                      ? "ring-2 ring-accent-500 ring-offset-1 border-white/40 z-20"
                      : isHovered
                        ? "brightness-110 border-white/30 z-10 scale-[1.01]"
                        : "border-black/10 opacity-90 hover:opacity-100"
                  )}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    backgroundColor: frameBg
                  }}
                  onClick={() => onSelectSpan(node)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <div className="flex items-center gap-1 min-w-0 truncate text-white drop-shadow-sm font-medium">
                    <span className="truncate">{node.name}</span>
                  </div>

                  {widthPercent > 8 ? (
                    <span className="text-[9px] font-mono text-white/90 tabular-nums shrink-0 ml-1">
                      {node.durationMs}ms
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* 4. 底部当前悬停/选中帧概览信息条 */}
      {hoveredNode ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-separator-border/60 bg-background-secondary-default/40 px-3.5 py-1.5 text-[10.5px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">{hoveredNode.name}</span>
            <span className="text-text-tertiary">·</span>
            <span className="text-text-secondary">{hoveredNode.operation}</span>
            {hoveredNode.model ? (
              <>
                <span className="text-text-tertiary">·</span>
                <span className="text-accent-500 font-medium">{hoveredNode.model}</span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span className="text-text-tertiary">
              起点: <b className="text-text-primary">{hoveredNode.startOffsetMs}ms</b>
            </span>
            <span className="text-text-tertiary">
              耗时: <b className="text-accent-500">{hoveredNode.durationMs}ms</b>
            </span>
            <span className={cx("font-bold uppercase", hoveredNode.status === "error" ? "text-rose-500" : "text-emerald-500")}>
              {hoveredNode.status}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
