/**
 * TaskList 纯函数与状态圆点。交互对标 T3 Tasks：圆点 + 右侧状态字，不用时钟/转圈。
 */
import { RiCheckLine } from "@remixicon/react"
import { uiT } from "@/i18n/ui-locale"
import { cx } from "@/utils/cx"
import type { NormalizedTask, TaskItem, TaskStatus } from "./task-list.types"

export function normalizeTasks(
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

export function statusFromIndex(index: number, currentIndex?: number): TaskStatus {
  if (currentIndex === undefined) return "pending"
  if (index < currentIndex) return "completed"
  if (index === currentIndex) return "in_progress"
  return "pending"
}

export function isLiveProgress(status: TaskStatus | undefined, live: boolean): boolean {
  return status === "in_progress" && live
}

export function taskStatusLabel(status: TaskStatus, live: boolean): string {
  if (status === "completed") return uiT("完成", "Done")
  if (status === "in_progress" && live) return uiT("运行中", "Running now")
  if (status === "in_progress") return uiT("已停止", "Stopped")
  return uiT("待办", "Pending")
}

export function ContinueButton({ onContinue }: { onContinue: () => void }) {
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

/** T3 式状态圆：进行中实心强调色，待办空心，完成勾。 */
export function TaskRadio({ status, live = true }: { status: TaskStatus; live?: boolean }) {
  if (status === "completed") {
    return (
      <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-accent-500">
        <RiCheckLine className="size-2.5 text-text-white" aria-hidden />
      </span>
    )
  }
  if (status === "in_progress" && live) {
    return <span className="size-3.5 shrink-0 rounded-full bg-accent-500" />
  }
  if (status === "in_progress") {
    return <span className="size-3.5 shrink-0 rounded-full border-2 border-text-tertiary" />
  }
  return <span className="size-3.5 shrink-0 rounded-full border border-border-button-default" />
}

export function TaskProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  return (
    <div
      className="h-0.5 w-16 overflow-hidden rounded-full bg-background-tertiary-default"
      aria-hidden
    >
      <div
        className={cx("h-full rounded-full bg-accent-500 transition-[width] duration-300")}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
