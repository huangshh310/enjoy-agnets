/**
 * Agent Todo List：Manus 风格的输入框一体化层叠任务舱 (Stacked Task Dock)。
 * 严丝合缝依附在输入框顶部，支持折叠态单行活跃步骤摘要与展开态高密度步骤清单。
 */
"use client"

import { useEffect, useRef, useState } from "react"
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckboxCircleFill,
  RiLoader4Line,
  RiPauseCircleLine,
  RiTimeLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { uiT, useUiLocale } from "@/i18n/ui-locale"

export interface TaskItem {
  id?: string
  title: string
  status?: "pending" | "in_progress" | "completed"
}

export interface TaskListProps {
  title?: string
  tasks: Array<TaskItem | string>
  currentIndex?: number
  defaultCollapsed?: boolean
  className?: string
  variant?: "card" | "dock"
  /** 当前 Agent 是否在跑。false 时 in_progress 显示为已停止，不要空转「运行中」。 */
  live?: boolean
  /** 停跑且任务未完成时，点「继续」再开一轮。 */
  onContinue?: () => void
}

type TaskStatus = NonNullable<TaskItem["status"]>

type NormalizedTask = {
  title: string
  status: TaskStatus
}

export function TaskList({
  title,
  tasks,
  currentIndex,
  defaultCollapsed,
  className,
  variant = "dock",
  live = true,
  onContinue
}: TaskListProps) {
  useUiLocale()
  const rows = normalizeTasks(tasks, currentIndex)
  const total = rows.length
  const completedCount = rows.filter((task) => task.status === "completed").length
  const allDone = total > 0 && completedCount === total

  // 默认折叠策略：若已全完成则默认优雅紧凑折叠；若有进行中任务则展开
  const [collapsed, setCollapsed] = useState(() =>
    defaultCollapsed !== undefined ? defaultCollapsed : allDone
  )

  const previousDone = useRef(allDone)
  useEffect(() => {
    // 当任务从未全部完成变为全完成时，自动平滑收缩
    if (!previousDone.current && allDone) {
      setCollapsed(true)
    }
    // 当有新未决任务进入时，自动展开
    if (previousDone.current && !allDone) {
      setCollapsed(false)
    }
    previousDone.current = allDone
  }, [allDone])

  const activeTask =
    rows.find((task) => task.status === "in_progress") ??
    (allDone ? rows[rows.length - 1] : rows.find((task) => task.status === "pending") ?? rows[0])

  const activeLive = isLiveProgress(activeTask?.status, live)
  const activeStatusLabel = allDone
    ? uiT("全部完成", "Completed")
    : activeLive
      ? uiT("正在执行...", "Running...")
      : activeTask?.status === "in_progress"
        ? uiT("已停止", "Stopped")
        : uiT("等待执行", "Pending")

  // --------------------------------------------------------------------------
  // Variant A: Manus 一体化层叠控制舱模式 (Dock Variant - Attached to Composer)
  // --------------------------------------------------------------------------
  if (variant === "dock") {
    return (
      <div
        className={cx(
          "w-full overflow-hidden rounded-t-2xl rounded-b-none border-t border-x border-border-button-default/90 bg-background-tertiary-default/80 shadow-2xs backdrop-blur-md transition-all duration-300 ease-out",
          collapsed ? "pb-3" : "pb-4",
          className
        )}
      >
        {collapsed ? (
          <div className="flex h-10 w-full items-center gap-1 px-4">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-expanded={false}
              className="group flex min-w-0 flex-1 cursor-pointer select-none items-center justify-between text-left transition-colors"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <DockStatusIcon
                  status={allDone ? "completed" : activeTask?.status ?? "pending"}
                  live={live}
                />
                <span className="truncate text-caption-1-medium text-text-primary">
                  {activeTask?.title || title || uiT("任务进行中", "Task in progress")}
                </span>
                <span className="shrink-0 text-caption-2-regular text-text-tertiary">
                  | {activeStatusLabel}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 pl-2 font-mono text-caption-2-regular text-text-tertiary">
                <span className="tabular-nums">
                  {completedCount}/{total}
                </span>
                <RiArrowDownSLine className="size-4 text-foreground-icon-secondary" />
              </div>
            </button>
            {onContinue && !live && !allDone ? <ContinueButton onContinue={onContinue} /> : null}
          </div>
        ) : (
          /* Manus 展开态：完整的任务进度明细面板 (Image #3) */
          <div className="flex flex-col px-4 pt-3 text-left">
            {/* 顶栏：任务进度标题 + 进度分数 + 收起箭头 */}
            <div
              onClick={() => setCollapsed(true)}
              className="flex cursor-pointer select-none items-center justify-between py-1 transition-colors hover:opacity-80"
            >
              <span className="text-caption-1-semibold text-text-tertiary">
                {title ?? uiT("任务进度", "Task progress")}
              </span>
              <div className="flex items-center gap-1 font-mono text-caption-2-regular text-text-tertiary">
                {onContinue && !live && !allDone ? (
                  <ContinueButton onContinue={onContinue} />
                ) : null}
                <span className="tabular-nums">
                  {completedCount}/{total}
                </span>
                <RiArrowUpSLine className="size-4 text-foreground-icon-secondary" />
              </div>
            </div>

            {/* 任务列表体：高密度优雅罗列 */}
            <ul className="mt-2 flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
              {rows.map((task, index) => {
                const isActive = isLiveProgress(task.status, live)
                const isStopped = task.status === "in_progress" && !live
                const isCompleted = task.status === "completed"

                return (
                  <li
                    key={`${task.title}-${index}`}
                    className="flex items-center gap-2.5 text-caption-1-medium leading-snug"
                  >
                    <DockStatusIcon status={task.status} live={live} />
                    <span
                      className={cx(
                        "min-w-0 flex-1 truncate",
                        isCompleted && "text-text-tertiary line-through select-text",
                        isActive && "font-medium text-text-primary",
                        !isCompleted && !isActive && "text-text-secondary"
                      )}
                    >
                      {task.title}
                    </span>
                    {isActive ? (
                      <span className="shrink-0 text-caption-2-medium text-amber-500">
                        | {uiT("运行中...", "Running...")}
                      </span>
                    ) : null}
                    {isStopped ? (
                      <span className="shrink-0 text-caption-2-medium text-text-tertiary">
                        | {uiT("已停止", "Stopped")}
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // Variant B: 常规卡片模式 (Card Variant - In Message Thread)
  // --------------------------------------------------------------------------
  return (
    <div
      className={cx(
        "w-full max-w-[440px] overflow-hidden rounded-2xl border border-separator-border/80 bg-background-secondary-default/95 dark:bg-background-tertiary-default/95 shadow-dropdown backdrop-blur-md",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between border-b border-separator-border/50 px-3.5 py-2.5 text-left select-none hover:bg-background-secondary-hover/40 transition-colors"
      >
        <span className="truncate text-caption-1-semibold text-text-primary">
          {title ?? uiT("任务清单", "Tasks")}
        </span>
        <div className="flex items-center gap-1.5 font-mono text-caption-2-regular text-text-tertiary">
          <span>
            {completedCount}/{total}
          </span>
          <RiArrowDownSLine className={cx("size-4 transition-transform", !collapsed && "rotate-180")} />
        </div>
      </button>

      {collapsed ? null : (
        <ul className="flex max-h-48 flex-col gap-1.5 p-2 overflow-y-auto">
          {rows.map((task, index) => (
            <li key={`${task.title}-${index}`} className="flex items-center gap-2 text-caption-1-medium">
              <DockStatusIcon status={task.status} />
              <span
                className={cx(
                  "min-w-0 flex-1 truncate",
                  task.status === "completed" && "text-text-tertiary line-through",
                  task.status === "in_progress" && "font-medium text-text-primary",
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

/**
 * 状态图标：与 Manus 视觉完全对齐：
 * - 进行中：黄色/琥珀色旋转环 (Manus 虚线圈质感)
 * - 待处理：灰色时钟图标 (Manus 待办时钟)
 * - 已完成：翠绿圆底勾勾
 */
function DockStatusIcon({ status, live = true }: { status: TaskStatus; live?: boolean }) {
  if (status === "in_progress" && live) {
    return (
      <RiLoader4Line className="size-4 shrink-0 animate-spin text-amber-500" />
    )
  }
  if (status === "in_progress") {
    return <RiPauseCircleLine className="size-4 shrink-0 text-text-tertiary" />
  }
  if (status === "completed") {
    return (
      <RiCheckboxCircleFill className="size-4 shrink-0 text-emerald-500" />
    )
  }
  return (
    <RiTimeLine className="size-4 shrink-0 text-text-tertiary/80" />
  )
}

function normalizeTasks(
  tasks: Array<TaskItem | string>,
  currentIndex?: number
): NormalizedTask[] {
  return tasks.map((task, index) => {
    if (typeof task === "string") {
      return { title: task, status: statusFromIndex(index, currentIndex) }
    }
    return {
      title: task.title,
      status: task.status ?? statusFromIndex(index, currentIndex)
    }
  })
}

function ContinueButton({ onContinue }: { onContinue: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onContinue()
      }}
      className="rounded-full border border-border-button-default bg-background-primary-default px-2 py-0.5 text-caption-2-medium text-text-secondary hover:text-text-primary"
    >
      {uiT("继续", "Continue")}
    </button>
  )
}

function isLiveProgress(status: TaskStatus | undefined, live: boolean): boolean {
  return status === "in_progress" && live
}

function statusFromIndex(index: number, currentIndex?: number): TaskStatus {
  if (currentIndex === undefined) return "pending"
  if (index < currentIndex) return "completed"
  if (index === currentIndex) return "in_progress"
  return "pending"
}
