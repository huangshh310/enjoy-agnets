/**
 * 任务列表：输入框上方「n/m 已完成」，展开才列项。不进输入壳。
 * 诚实态：failed / cancelled / in_progress&&!running → 折叠与展开均可见失败/已停止。
 */
import { useState } from "react"
import {
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiListCheck3,
  RiLoader4Line
} from "@remixicon/react"
import { dockHonestyCounts } from "@/components/ai-elements/task-list-honesty"
import type { TaskStatus } from "@/components/ai-elements/task-list.types"
import { continueTodoTurn } from "@renderer/hooks/continue-todo-turn"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { latestSessionTodoList } from "../../thread/tool-surfaces/select-turn-tool-surfaces"
import { ComposerStackedRow, stackedActionClass } from "./composer-stacked-row"
import { STACKED_PANEL_CLASS_NAME } from "./composer-stacked-styles"
import { stackRowStatusLabel, stackedTasksLabel } from "./composer-task-stack-copy"

type StackTask = { title: string; status: TaskStatus }

export function ComposerTaskStack() {
  const t = useT()
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const todos = latestSessionTodoList(messages)
  const [open, setOpen] = useState(false)
  if (!todos || todos.tasks.length === 0) return null

  const rows: StackTask[] = todos.tasks.map((item) =>
    typeof item === "string"
      ? { title: item, status: "pending" }
      : { title: item.title, status: item.status ?? "pending" }
  )
  const total = rows.length
  const done = rows.filter((row) => row.status === "completed").length
  const allDone = done === total
  const honesty = dockHonestyCounts(rows, running)
  const label = stackedTasksLabel(t, done, total, honesty)

  return (
    <div data-testid="composer-task-stack" className={STACKED_PANEL_CLASS_NAME}>
      <ComposerStackedRow
        icon={<RiListCheck3 className="size-3.5" />}
        label={label}
        open={open}
        onToggle={() => setOpen((next) => !next)}
        actions={
          !running && !allDone ? (
            <button
              type="button"
              className={stackedActionClass("h-6 w-auto px-2")}
              onClick={() => void continueTodoTurn()}
            >
              {t("chat.continueTodos")}
            </button>
          ) : null
        }
      >
        <ol className="flex flex-col gap-0.5">
          {rows.map((row, index) => {
            const statusText = stackRowStatusLabel(t, row.status, running)
            return (
              <li key={`${row.title}-${index}`} className="flex items-start gap-2 py-0.5">
                <span
                  className={
                    row.status === "completed"
                      ? "mt-0.5 flex size-3.5 shrink-0 items-center justify-center text-state-success-text"
                      : row.status === "failed"
                        ? "mt-0.5 flex size-3.5 shrink-0 items-center justify-center text-text-error-primary"
                        : "mt-0.5 flex size-3.5 shrink-0 items-center justify-center text-text-secondary"
                  }
                >
                  <TaskGlyph status={row.status} live={running} />
                </span>
                <span className="w-4 shrink-0 tabular-nums text-text-secondary">{index + 1}.</span>
                <span
                  className={
                    row.status === "completed"
                      ? "min-w-0 flex-1 text-text-secondary line-through"
                      : row.status === "failed"
                        ? "min-w-0 flex-1 text-text-error-primary"
                        : "min-w-0 flex-1 text-text-primary"
                  }
                >
                  {row.title}
                </span>
                {statusText ? (
                  <span
                    className={
                      row.status === "failed"
                        ? "shrink-0 text-caption-2-regular text-text-error-primary"
                        : "shrink-0 text-caption-2-regular text-text-secondary"
                    }
                  >
                    {statusText}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ol>
      </ComposerStackedRow>
    </div>
  )
}

function TaskGlyph({ status, live }: { status: TaskStatus; live: boolean }) {
  if (status === "completed") return <RiCheckboxCircleFill className="size-3.5" />
  if (status === "failed") return <RiCloseCircleFill className="size-3.5" />
  if (status === "in_progress" && live) return <RiLoader4Line className="size-3.5 animate-spin" />
  if (status === "cancelled" || status === "in_progress") {
    return <span className="block size-1.5 rounded-full border-2 border-current" />
  }
  return <span className="block size-1.5 rounded-full border border-current" />
}
