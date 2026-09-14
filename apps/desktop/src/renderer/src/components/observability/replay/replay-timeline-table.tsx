/**
 * 回放事件流时间线表格列表组件。
 */
import { RiArrowRightLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { ReplayRow } from "./replay.types"

export function ReplayTimelineTable({
  rows,
  selectedRow,
  playbackIndex,
  onSelect
}: {
  rows: ReplayRow[]
  selectedRow: ReplayRow | null
  playbackIndex: number
  onSelect: (row: ReplayRow, index: number) => void
}) {
  return (
    <div className="lg:col-span-7 flex flex-col rounded-xl border border-separator-border/70 bg-background-primary-default overflow-hidden shadow-2xs">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-separator-border/50 bg-background-secondary-default/30 text-caption-2-medium">
        <span className="font-semibold text-text-primary">
          事件时序流 ({rows.length} 条)
        </span>
        <span className="text-text-tertiary">
          点击单行检查结构化载荷
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-separator-border/30 max-h-[520px]">
        {rows.map((row, idx) => {
          const isSelected = selectedRow === row || playbackIndex === idx
          const typeColor = row.type.startsWith("run.")
            ? "bg-accent-500/10 text-accent-500 border-accent-500/20"
            : row.type.startsWith("tool.")
              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
              : row.type.startsWith("approval.")
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-status-success-background text-status-success-foreground border-status-success-border"

          return (
            <div
              key={`${row.runId ?? "run"}-${row.sequence ?? idx}`}
              onClick={() => onSelect(row, idx)}
              className={cx(
                "flex items-center justify-between px-3.5 py-2 transition-colors cursor-pointer text-caption-2-medium",
                isSelected
                  ? "bg-accent-500/10 ring-1 ring-inset ring-accent-500/30"
                  : "hover:bg-background-secondary-hover/40"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-caption-2-medium font-bold text-text-tertiary shrink-0">
                  #{String(row.sequence ?? idx + 1).padStart(3, "0")}
                </span>

                <span
                  className={cx(
                    "rounded-md px-2 py-0.5 text-caption-2-medium font-bold border shrink-0",
                    typeColor
                  )}
                >
                  {row.type}
                </span>

                {row.toolName ? (
                  <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-caption-2-medium text-purple-600 dark:text-purple-400 font-semibold truncate">
                    tool: {row.toolName}
                  </span>
                ) : null}

                {row.decision ? (
                  <span className="rounded bg-status-success-background px-1.5 py-0.5 text-caption-2-medium text-status-success-foreground font-semibold truncate">
                    decision: {row.decision}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-3 shrink-0 text-caption-2-medium text-text-tertiary">
                {row.runId ? (
                  <span className="hidden sm:inline font-mono">
                    {row.runId.slice(0, 14)}
                  </span>
                ) : null}
                <RiArrowRightLine
                  className={cx(
                    "size-3 transition-transform",
                    isSelected ? "text-accent-500 translate-x-0.5" : "text-text-tertiary/40"
                  )}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between px-3.5 py-2 border-t border-separator-border/40 bg-background-secondary-default/20 text-caption-2-medium text-text-tertiary">
        <span>已加载 {rows.length} 个流式回放事件</span>
        <span>Sequence 升序保序就绪</span>
      </div>
    </div>
  )
}
