/**
 * Agent 任务列表。Dock 对标 T3 Tasks 面板（进度条 + 圆点 + 右侧状态），皮走 BoardUI token。
 */
"use client"

import { useEffect, useRef, useState } from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { uiT, useUiLocale } from "@/i18n/ui-locale"
import { TaskListDock } from "./task-list-dock"
import { ContinueButton, normalizeTasks, TaskRadio } from "./task-list-helpers"
import type {
  NormalizedTask,
  TaskItem,
  TaskListProps,
  TaskStatus
} from "./task-list.types"

export type { TaskItem, TaskListProps, TaskStatus, NormalizedTask }

export function TaskList({
  title,
  tasks,
  currentIndex,
  defaultCollapsed,
  className,
  variant = "dock",
  live = true,
  onContinue,
  action,
  footer
}: TaskListProps) {
  useUiLocale()
  const rows = normalizeTasks(tasks, currentIndex)
  const total = rows.length
  const completedCount = rows.filter((task) => task.status === "completed").length
  const allDone = total > 0 && completedCount === total
  const [collapsed, setCollapsed] = useState(() =>
    defaultCollapsed !== undefined ? defaultCollapsed : allDone
  )
  const previousDone = useRef(allDone)

  useEffect(() => {
    if (!previousDone.current && allDone) setCollapsed(true)
    if (previousDone.current && !allDone) setCollapsed(false)
    previousDone.current = allDone
  }, [allDone])

  if (variant === "dock") {
    return (
      <div className={cx("w-full min-w-0", className)}>
        <TaskListDock
          title={title}
          rows={rows}
          collapsed={collapsed}
          live={live}
          onToggle={() => setCollapsed((value) => !value)}
          onContinue={onContinue}
          action={action}
          footer={footer}
        />
      </div>
    )
  }

  return (
    <div
      className={cx(
        "w-full max-w-[440px] overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default shadow-card",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="truncate text-caption-1-semibold text-text-primary">
          {title ?? uiT("任务", "Tasks")}
        </span>
        <div className="flex items-center gap-1.5 text-caption-2-regular text-text-tertiary">
          {onContinue && !live && !allDone ? <ContinueButton onContinue={onContinue} /> : null}
          <span className="tabular-nums">
            {completedCount}/{total} {uiT("完成", "complete")}
          </span>
          <RiArrowDownSLine className={cx("size-4 transition-transform", !collapsed && "rotate-180")} />
        </div>
      </button>
      {collapsed ? null : (
        <ul className="flex max-h-48 flex-col border-t border-separator-border/60 px-2 py-1">
          {rows.map((task, index) => (
            <li key={`${task.title}-${index}`} className="flex items-center gap-2.5 px-1.5 py-1.5">
              <TaskRadio status={task.status} live={live} />
              <span
                className={cx(
                  "min-w-0 flex-1 truncate text-caption-1-medium",
                  task.status === "completed" && "text-text-tertiary",
                  task.status === "in_progress" && "text-text-primary",
                  task.status === "pending" && "text-text-secondary"
                )}
              >
                {task.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
