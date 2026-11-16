/**
 * TaskList 交互件与归一化。状态文案见 task-list-status。
 */
import { RiCheckLine } from "@remixicon/react"
import { uiT } from "@/i18n/ui-locale"
import { cx } from "@/utils/cx"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { NormalizedTask, TaskItem, TaskStatus } from "./task-list.types"
import { statusFromIndex } from "./task-list-status"

export {
  dockHonestyCounts,
  isLiveProgress,
  statusFromIndex,
  taskStatusLabel
} from "./task-list-status"

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

/**
 * disabledHint：可见但置灰（aria-disabled，不用原生 disabled——否则 tooltip 出不来），悬停给说明，点了不动。
 * 桌面端在停止收尾没落定时传「停干净后再试」（luna C1b）。
 */
export function ContinueButton({ onContinue, disabledHint }: { onContinue: () => void; disabledHint?: string }) {
  const locked = Boolean(disabledHint)
  const button = (
    <button
      type="button"
      data-testid="todo-continue"
      aria-disabled={locked || undefined}
      onClick={(event) => {
        event.stopPropagation()
        if (!locked) onContinue()
      }}
      className={cx(
        "rounded-full border border-border-button-default bg-background-primary-default px-2 py-0.5 text-caption-2-medium text-text-secondary",
        locked ? "cursor-not-allowed opacity-40" : "hover:text-text-primary"
      )}
    >
      {uiT("继续", "Continue")}
    </button>
  )
  if (!locked) return button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{disabledHint}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** T3 式状态圆：进行中实心强调色，待办空心，完成勾。 */
export function TaskRadio({ status, live = true }: { status: TaskStatus; live?: boolean }) {
  if (status === "completed") {
    return (
      <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-cta">
        <RiCheckLine className="size-2.5 text-cta-foreground" aria-hidden />
      </span>
    )
  }
  if (status === "in_progress" && live) {
    return <span className="size-3.5 shrink-0 rounded-full bg-accent-500" />
  }
  if (status === "failed") {
    return <span className="size-3.5 shrink-0 rounded-full bg-text-error-primary" />
  }
  if (status === "cancelled") {
    return <span className="size-3.5 shrink-0 rounded-full border-2 border-text-tertiary" />
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
