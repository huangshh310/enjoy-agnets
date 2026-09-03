/**
 * Composer 上方 Todo List：取会话里最后一份 todo_write，点标题折叠。
 */
import { TaskList } from "@/components/ai-elements/task-list"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { latestSessionTodoList } from "../thread/tool-surfaces/select-turn-tool-surfaces"

export function ComposerTodoDock() {
  const t = useT()
  const messages = useChatStore((state) => state.messages)
  const todos = latestSessionTodoList(messages)
  if (!todos || todos.tasks.length === 0) return null

  const allCompleted = todos.tasks.every(
    (t) => (typeof t === "string" ? false : t.status === "completed")
  )

  return (
    <div className="relative z-0 -mb-2.5 flex w-full justify-center px-4 animate-in fade-in-50 duration-200">
      <TaskList
        title={todos.title ?? t("chat.todos")}
        tasks={todos.tasks}
        variant="dock"
        defaultCollapsed={allCompleted}
      />
    </div>
  )
}
