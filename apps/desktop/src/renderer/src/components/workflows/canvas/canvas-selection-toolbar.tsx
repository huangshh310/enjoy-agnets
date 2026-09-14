/**
 * 框选 / 多选操作栏（Selection Toolbar）。
 * 当选中 2 个及以上节点时在包围盒上方呈现：一键成组、对齐、批量删除等操作。
 */
import {
  RiAlignBottom,
  RiAlignCenter,
  RiAlignLeft,
  RiAlignRight,
  RiAlignTop,
  RiDeleteBinLine,
  RiStackLine
} from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { CanvasNodeData, ViewportTransform } from "../lib/canvas.types"
import { useCanvasTheme } from "../stores/use-canvas-theme"

export type AlignmentType = "left" | "center-x" | "right" | "top" | "center-y" | "bottom"

export function CanvasSelectionToolbar({
  nodes,
  viewport,
  onGroup,
  onAlign,
  onDelete
}: {
  nodes: CanvasNodeData[]
  viewport: ViewportTransform
  onGroup: () => void
  onAlign: (type: AlignmentType) => void
  onDelete: () => void
}) {
  const t = useT()
  const theme = useCanvasTheme()

  if (nodes.length < 2) return null

  // 计算外包围盒 (Bounding Box)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + node.width)
    maxY = Math.max(maxY, node.position.y + node.height)
  }

  const pad = 12
  const left = viewport.x + minX * viewport.k - pad
  const top = viewport.y + minY * viewport.k - pad
  const width = (maxX - minX) * viewport.k + pad * 2
  const height = (maxY - minY) * viewport.k + pad * 2

  return (
    <>
      {/* 多选外包围盒虚线轮廓 */}
      <svg
        className="pointer-events-none absolute z-[60] overflow-visible"
        style={{ left, top, width, height }}
      >
        <rect
          x={1}
          y={1}
          width={Math.max(width - 2, 0)}
          height={Math.max(height - 2, 0)}
          rx={16}
          ry={16}
          fill={theme.canvas.selectionFill}
          stroke={theme.canvas.selectionStroke}
          strokeOpacity={0.4}
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
      </svg>

      {/* 浮动操作栏 */}
      <div
        className="pointer-events-auto absolute z-[75] flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-2xl border p-1 shadow-xl backdrop-blur-md transition-all"
        style={{
          left: left + width / 2,
          top: top - 10,
          background: theme.toolbar.panel,
          borderColor: theme.toolbar.border,
          color: theme.toolbar.item
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 一键成组 */}
        <button
          type="button"
          title="将选中节点编组 (⌘G)"
          className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          style={{ color: theme.node.text }}
          onClick={onGroup}
        >
          <RiStackLine className="size-3.5 text-blue-500" />
          <span>{t("pages.workflows.canvasGroup")} ({nodes.length})</span>
        </button>

        <div className="h-4 w-px opacity-40" style={{ background: theme.toolbar.border }} />

        {/* 对齐按钮组 */}
        <button
          type="button"
          title="左对齐"
          className="flex size-7 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => onAlign("left")}
        >
          <RiAlignLeft className="size-3.5" />
        </button>
        <button
          type="button"
          title="水平居中对齐"
          className="flex size-7 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => onAlign("center-x")}
        >
          <RiAlignCenter className="size-3.5" />
        </button>
        <button
          type="button"
          title="右对齐"
          className="flex size-7 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => onAlign("right")}
        >
          <RiAlignRight className="size-3.5" />
        </button>
        <button
          type="button"
          title="顶部对齐"
          className="flex size-7 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => onAlign("top")}
        >
          <RiAlignTop className="size-3.5" />
        </button>
        <button
          type="button"
          title="底部对齐"
          className="flex size-7 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => onAlign("bottom")}
        >
          <RiAlignBottom className="size-3.5" />
        </button>

        <div className="h-4 w-px opacity-40" style={{ background: theme.toolbar.border }} />

        {/* 批量删除 */}
        <button
          type="button"
          title="删除所选节点"
          className="flex size-7 items-center justify-center rounded-lg text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10"
          onClick={onDelete}
        >
          <RiDeleteBinLine className="size-3.5" />
        </button>
      </div>
    </>
  )
}
