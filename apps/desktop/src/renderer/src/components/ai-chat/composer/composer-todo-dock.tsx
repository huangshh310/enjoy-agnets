/**
 * Composer 上方 Todo List：只画「最后一条用户消息之后」的 todo_write。
 * 新一轮发送先收起旧表；Agent 停跑后 in_progress 不再空转「运行中」。
 */
import { TaskList } from "@/components/ai-elements/task-list"
import { continueTodoTurn } from "@renderer/hooks/continue-todo-turn"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { latestSessionTodoList } from "../thread/tool-surfaces/select-turn-tool-surfaces"

export function ComposerTodoDock() {
  const t = useT()
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const todos = latestSessionTodoList(messages)
  if (!todos || todos.tasks.length === 0) return null

  const allCompleted = todos.tasks.every(
    (item) => (typeof item === "string" ? false : item.status === "completed")
  )

  function continueOpenTodos() {
    void continueTodoTurn()
  }

  return (
    <div className="relative z-0 -mb-2.5 flex w-full justify-center px-4 animate-in fade-in-50 duration-200">
      <TaskList
        title={todos.title ?? t("chat.todos")}
        tasks={todos.tasks}
        variant="dock"
        defaultCollapsed={allCompleted}
        live={running}
        onContinue={running || allCompleted ? undefined : continueOpenTodos}
      />
    </div>
  )
}
