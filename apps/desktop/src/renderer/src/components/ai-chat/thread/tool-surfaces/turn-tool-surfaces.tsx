/**
 * 助手轮可见工具表面：File Diff / Tool Result。
 * 多文件 Diff 自动聚合为横向可切换标签栏 (Multi-File Diff Tabs)，支持滚轮水平滚动与左右翻页。
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { RiArrowLeftSLine, RiArrowRightSLine, RiCodeSSlashLine } from "@remixicon/react"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { asRecord, readString } from "../../../../lib/record.ts"
import { ToolResultView } from "../../diff/tool-result"
import { hasTurnToolSurfaces, toolResultSurfaces } from "./select-turn-tool-surfaces"

export function TurnToolSurfaces({ tools }: { tools: ThreadToolCall[] }) {
  if (!hasTurnToolSurfaces(tools)) return null
  const diffTools = toolResultSurfaces(tools)
  if (diffTools.length === 0) return null

  return (
    <div className="mt-2 flex w-full flex-col gap-2">
      {/* 仅呈现带有文件代码变更的多文件差异标签切换视图 */}
      <MultiFileDiffTabs tools={diffTools} />
    </div>
  )
}

/** 多文件差异标签切换查看器 */
function MultiFileDiffTabs({ tools }: { tools: ThreadToolCall[] }) {
  const [selectedId, setSelectedId] = useState<string>(() => tools[0]?.id || "")
  const activeTool = tools.find((t) => t.id === selectedId) || tools[0]
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    updateScrollState()
    window.addEventListener("resize", updateScrollState)
    return () => window.removeEventListener("resize", updateScrollState)
  }, [updateScrollState, tools])

  // 鼠标滚轮直接转横向滚动
  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    const el = scrollRef.current
    if (!el || e.deltaY === 0) return
    el.scrollLeft += e.deltaY
    updateScrollState()
  }

  function scrollByStep(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" })
    setTimeout(updateScrollState, 200)
  }

  // 单文件时无需标签栏，直接展示卡片
  if (tools.length <= 1 && activeTool) {
    return <ToolResultView tool={activeTool} />
  }

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default shadow-2xs">
      {/* 顶部横向滚动文件标签条 */}
      <div className="flex items-center border-b border-separator-border/70 bg-background-secondary-default/60 p-1 select-none">
        {/* 左滚动按钮 */}
        {canScrollLeft ? (
          <button
            type="button"
            onClick={() => scrollByStep(-180)}
            aria-label="Scroll left"
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
          >
            <RiArrowLeftSLine className="size-4" />
          </button>
        ) : null}

        {/* 可滚动标签容器 */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          onScroll={updateScrollState}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 py-0.5 scrollbar-thin"
        >
          {tools.map((tool) => {
            const res = asRecord(tool.result)
            const path = readString(res, "path") || tool.name
            const fileName = path.split(/[\\/]/).pop() || path
            const additions = typeof res.additions === "number" ? res.additions : undefined
            const deletions = typeof res.deletions === "number" ? res.deletions : undefined
            const isSelected = tool.id === (activeTool?.id ?? "")

            return (
              <button
                key={tool.id}
                type="button"
                onClick={(e) => {
                  setSelectedId(tool.id)
                  e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" })
                }}
                className={cx(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11.5px] transition-all cursor-pointer",
                  isSelected
                    ? "border border-separator-border/80 bg-background-primary-default font-semibold text-text-primary shadow-2xs"
                    : "text-text-tertiary hover:bg-background-secondary-hover/60 hover:text-text-primary"
                )}
              >
                <RiCodeSSlashLine className="size-3 text-accent-500" />
                <span className="max-w-[140px] truncate">{fileName}</span>
                {additions != null ? (
                  <span className="text-[10px] text-state-success-text">+{additions}</span>
                ) : null}
                {deletions != null ? (
                  <span className="text-[10px] text-text-error-primary">-{deletions}</span>
                ) : null}
              </button>
            )
          })}
        </div>

        {/* 右滚动按钮 */}
        {canScrollRight ? (
          <button
            type="button"
            onClick={() => scrollByStep(180)}
            aria-label="Scroll right"
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
          >
            <RiArrowRightSLine className="size-4" />
          </button>
        ) : null}
      </div>

      {/* 当前选中文件的 Diff 详情 */}
      {activeTool ? (
        <div className="p-2.5">
          <ToolResultView tool={activeTool} />
        </div>
      ) : null}
    </div>
  )
}
