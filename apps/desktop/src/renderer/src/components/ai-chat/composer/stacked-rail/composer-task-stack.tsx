/**
 * 任务列表：输入框上方「n/m 已完成」，展开才列项。不进输入壳。
 */
import { useState } from "react"
import { RiCheckboxCircleFill, RiListCheck3, RiLoader4Line } from "@remixicon/react"
import { continueTodoTurn } from "@renderer/hooks/continue-todo-turn"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { latestSessionTodoList } from "../../thread/tool-surfaces/select-turn-tool-surfaces"
import { ComposerStackedRow, stackedActionClass } from "./composer-stacked-row"
import { STACKED_PANEL_CLASS_NAME } from "./composer-stacked-styles"

type TaskStatus = "pending" | "in_progress" | "completed"

export function ComposerTaskStack() {
  const t = useT()
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const todos = latestSessionTodoList(messages)
  const [open, setOpen] = useState(false)
  if (!todos || todos.tasks.length === 0) return null

  const rows = todos.tasks.map((item) =>
    typeof item === "string"
      ? { title: item, status: "pending" as TaskStatus }
      : { title: item.title, status: (item.status ?? "pending") as TaskStatus }
  )
  const total = rows.length
  const done = rows.filter((row) => row.status === "completed").length
  const allDone = done === total

  return (
    <div data-testid="composer-task-stack" className={STACKED_PANEL_CLASS_NAME}>
      <ComposerStackedRow
        icon={<RiListCheck3 className="size-3.5" />}
        label={t("chat.stackedTasksProgress", { done, total })}
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
          {rows.map((row, index) => (
            <li key={`${row.title}-${index}`} className="flex items-start gap-2 py-0.5">
              <span
                className={
                  row.status === "completed"
                    ? "mt-0.5 flex size-3.5 shrink-0 items-center justify-center text-state-success-text"
                    : "mt-0.5 flex size-3.5 shrink-0 items-center justify-center text-text-secondary"
                }
              >
                <TaskGlyph status={row.status} />
              </span>
              <span className="w-4 shrink-0 tabular-nums text-text-secondary">{index + 1}.</span>
              <span
                className={
                  row.status === "completed"
                    ? "min-w-0 flex-1 text-text-secondary line-through"
                    : "min-w-0 flex-1 text-text-primary"
                }
              >
                {row.title}
              </span>
            </li>
          ))}
        </ol>
      </ComposerStackedRow>
    </div>
  )
}

function TaskGlyph({ status }: { status: TaskStatus }) {
  if (status === "completed") return <RiCheckboxCircleFill className="size-3.5" />
  if (status === "in_progress") return <RiLoader4Line className="size-3.5 animate-spin" />
  return <span className="block size-1.5 rounded-full border border-current" />
}
