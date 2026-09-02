/**
 * AI Task List / To-do List 组件：
 * 采用 Cursor 风格的 Agent 任务状态跟踪器 (参考 https://www.aicss.dev/components/task-list)。
 * 具备进度饼图头部、数字翻滚动画、正在进行项的动态发光扫光 (todo-shine) 与已完成划线。
 */
import { useEffect, useRef, useState } from "react"
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
}

// 勾选完成图标
function CheckIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className={cx(
        "size-4 shrink-0 transition-opacity duration-300",
        active ? "opacity-100 text-emerald-500" : "opacity-0"
      )}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

// 进行中箭头指示
function ArrowIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className={cx(
        "size-4 shrink-0 transition-opacity duration-300",
        active ? "opacity-100 text-accent-500" : "opacity-0"
      )}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

// 待处理虚线圆圈
function DashedIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className={cx(
        "size-4 shrink-0 transition-opacity duration-300 text-text-tertiary",
        active ? "opacity-100" : "opacity-0"
      )}
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeDasharray="2.5 3.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// 数字翻滚动画插槽
function RollDigit({ char }: { char: string }) {
  const prev = useRef(char)
  const [roll, setRoll] = useState<{ from: string; to: string } | null>(null)
  const [up, setUp] = useState(false)

  useEffect(() => {
    if (char === prev.current) return
    const from = prev.current
    prev.current = char
    setRoll({ from, to: char })
    setUp(false)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setUp(true)))
    const done = setTimeout(() => setRoll(null), 380)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(done)
    }
  }, [char])

  if (!roll) return <span className="inline-block h-[1em] leading-[1em]">{char}</span>

  return (
    <span className="inline-block overflow-hidden h-[1em] leading-[1em]">
      <span
        className={cx(
          "flex flex-col transition-transform duration-350 ease-out",
          up && "-translate-y-[1em]"
        )}
      >
        <span className="h-[1em] leading-[1em]">{roll.from}</span>
        <span className="h-[1em] leading-[1em]">{roll.to}</span>
      </span>
    </span>
  )
}

export function TaskList({
  title,
  tasks,
  currentIndex,
  defaultCollapsed = false,
  className
}: TaskListProps) {
  useUiLocale()
  const heading = title ?? uiT("待办", "To-dos")
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const normalizedTasks: Array<{ title: string; status: "pending" | "in_progress" | "completed" }> =
    tasks.map((t, i) => {
      if (typeof t === "string") {
        if (currentIndex !== undefined) {
          if (i < currentIndex) return { title: t, status: "completed" }
          if (i === currentIndex) return { title: t, status: "in_progress" }
          return { title: t, status: "pending" }
        }
        return { title: t, status: "pending" }
      }
      return {
        title: t.title,
        status: t.status ?? (currentIndex !== undefined ? (i < currentIndex ? "completed" : i === currentIndex ? "in_progress" : "pending") : "pending")
      }
    })

  const total = normalizedTasks.length
  const completedCount = normalizedTasks.filter((t) => t.status === "completed").length
  const allDone = total > 0 && completedCount === total
  const hasInProgress = normalizedTasks.some((t) => t.status === "in_progress")
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  return (
    <div
      className={cx(
        "w-full rounded-2xl border border-separator-border/70 bg-background-primary-default p-3 shadow-2xs font-sans text-[13px] text-text-primary",
        className
      )}
    >
      {/* 头部标题与进度饼图 */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 text-left cursor-pointer select-none group"
      >
        {/* 左侧动态图标 / 饼图 */}
        <div className="relative size-4 shrink-0 flex items-center justify-center text-text-tertiary">
          {allDone ? (
            <svg
              className="size-4 text-emerald-500 fill-emerald-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
              />
            </svg>
          ) : hasInProgress ? (
            <svg className="size-4 -rotate-90" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-separator-border/60"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeDasharray={`${(pct / 100) * 56.5} 56.5`}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
          ) : (
            <svg
              className="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 5h8M13 12h8M13 19h8M3 17l2 2 4-4M3 7l2 2 4-4" />
            </svg>
          )}
        </div>

        <span className="font-semibold text-text-primary text-[13px]">{heading}</span>

        {/* 翻滚计数器 */}
        <div className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-text-tertiary">
          <span className="inline-flex items-baseline">
            {`${completedCount}/${total}`.split("").map((c, i) => (
              <RollDigit key={i} char={c} />
            ))}
          </span>

          <svg
            className={cx(
              "size-3.5 text-text-tertiary transition-transform duration-200",
              collapsed ? "-rotate-90" : "rotate-0"
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* 可折叠任务列表 */}
      <div
        className={cx(
          "grid transition-[grid-template-rows,opacity] duration-250",
          collapsed ? "grid-rows-[0fr] opacity-0 pointer-events-none" : "grid-rows-[1fr] opacity-100"
        )}
      >
        <div className="overflow-hidden">
          <ul className="flex flex-col gap-2 pt-3">
            {normalizedTasks.map((task, i) => {
              const isDone = task.status === "completed"
              const isActive = task.status === "in_progress"

              return (
                <li
                  key={i}
                  className="flex items-start gap-2.5 leading-snug"
                >
                  {/* 图标状态栈 */}
                  <div className="relative size-4 shrink-0 mt-0.5">
                    <DashedIcon active={!isDone && !isActive} />
                    <ArrowIcon active={isActive} />
                    <CheckIcon active={isDone} />
                  </div>

                  {/* 任务文字 (带动态发光扫光动画) */}
                  <div className="relative flex-1 text-[12.5px] leading-relaxed">
                    {isActive ? (
                      <span className="font-medium text-text-primary animate-pulse bg-gradient-to-r from-text-primary via-accent-500 to-text-primary bg-clip-text text-transparent bg-[length:200%_auto]">
                        {task.title}
                      </span>
                    ) : isDone ? (
                      <span className="text-text-tertiary line-through">{task.title}</span>
                    ) : (
                      <span className="text-text-secondary">{task.title}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
