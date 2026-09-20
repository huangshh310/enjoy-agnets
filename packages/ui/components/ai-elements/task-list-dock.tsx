/**
 * Composer 上沿任务面板：标题 + n/m complete 进度条，行内圆点与右侧状态。
 */
"use client"
import { RiArrowDownSLine, RiListCheck3 } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { uiT } from "@/i18n/ui-locale"
import {
  ContinueButton,
  isLiveProgress,
  TaskProgressBar,
  TaskRadio,
  taskStatusLabel
} from "./task-list-helpers"
import type { NormalizedTask, TaskStatus } from "./task-list.types"

export function TaskListDock({
  title,
  rows,
  collapsed,
  live,
  onToggle,
  onContinue,
  action,
  footer,
  fused,
  className
}: {
  title?: string
  rows: NormalizedTask[]
  collapsed: boolean
  live: boolean
  onToggle: () => void
  onContinue?: () => void
  action?: React.ReactNode
  footer?: React.ReactNode
  fused?: boolean
  className?: string
}) {
  const total = rows.length
  const completedCount = rows.filter((task) => task.status === "completed").length
  const heading = formatTaskHeading(title)
  const showContinue = Boolean(onContinue && !live && completedCount < total)

  return (
    <div
      className={cx(
        "w-full overflow-hidden",
        fused
          ? "border-b border-separator-border/70 bg-transparent"
          : "rounded-xl border border-border-button-default bg-background-primary-default shadow-card",
        className
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left"
      >
        <RiListCheck3 className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-caption-1-semibold text-text-primary">
          {heading}
        </span>
        <span className="shrink-0 text-caption-2-regular text-text-tertiary tabular-nums">
          {completedCount}/{total} {uiT("完成", "complete")}
        </span>
        <TaskProgressBar completed={completedCount} total={total} />
        {action ? <div className="shrink-0">{action}</div> : null}
        {showContinue && onContinue ? <ContinueButton onContinue={onContinue} /> : null}
        <RiArrowDownSLine
          className={cx(
            "size-4 shrink-0 text-foreground-icon-secondary transition-transform",
            !collapsed && "rotate-180"
          )}
        />
      </button>
      {collapsed ? null : (
        <ul className="flex max-h-56 flex-col border-t border-separator-border/60 px-2 py-1">
          {rows.map((task, index) => (
            <TaskRow key={`${task.title}-${index}`} task={task} live={live} />
          ))}
        </ul>
      )}
      {footer ? <div className="border-t border-separator-border/40">{footer}</div> : null}
    </div>
  )
}

function TaskRow({ task, live }: { task: NormalizedTask; live: boolean }) {
  const running = isLiveProgress(task.status, live)
  return (
    <li className="flex items-center gap-2.5 px-1.5 py-1.5">
      <TaskRadio status={task.status} live={live} />
      <span
        className={cx(
          "min-w-0 flex-1 truncate text-caption-1-medium",
          task.status === "completed" && "text-text-tertiary",
          running && "text-text-primary",
          !running && task.status !== "completed" && "text-text-secondary"
        )}
      >
        {task.title}
      </span>
      <span className={cx("shrink-0 text-caption-2-regular", statusTone(task.status, live))}>
        {taskStatusLabel(task.status, live)}
      </span>
    </li>
  )
}

function formatTaskHeading(title?: string): string {
  const prefix = uiT("任务", "Tasks")
  const trimmed = title?.trim()
  if (!trimmed || trimmed === prefix || trimmed === "待办" || trimmed === "To-dos") return prefix
  return `${prefix} ${trimmed}`
}

function statusTone(status: TaskStatus, live: boolean): string {
  if (status === "in_progress" && live) return "text-accent-500"
  return "text-text-tertiary"
}
