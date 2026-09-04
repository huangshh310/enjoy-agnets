/**
 * 从工具调用里取最后一份 Todo List，判断是否还有未完成项。
 */
export type TodoToolLike = {
  name?: string
  args?: unknown
  result?: unknown
}

export const MAX_TODO_CONTINUES = 2

export function hasOpenTodosFromTools(tools: TodoToolLike[]): boolean {
  const todos = lastTodoStatuses(tools)
  if (todos.length === 0) return false
  return todos.some((status) => status !== "completed")
}

/** 模型用计划文字收工、Todo 还没做完时，同 run 再泵。 */
export function shouldContinueOpenTodos(input: {
  aborted: boolean
  todoContinues: number
  tools: TodoToolLike[]
}): boolean {
  if (input.aborted) return false
  if (input.todoContinues >= MAX_TODO_CONTINUES) return false
  const statuses = lastTodoStatuses(input.tools)
  if (!statuses.includes("in_progress")) return false
  return statuses.some((status) => status !== "completed")
}

export function lastTodoStatuses(tools: TodoToolLike[]): string[] {
  for (let index = tools.length - 1; index >= 0; index--) {
    const tool = tools[index]
    if (!isTodoWriteName(tool?.name)) continue
    const statuses = statusesFromTool(tool)
    if (statuses.length > 0) return statuses
  }
  return []
}

function isTodoWriteName(name: string | undefined): boolean {
  const normalized = name?.toLowerCase() ?? ""
  return normalized === "todo_write" || normalized === "todo" || normalized === "update_todos"
}

function statusesFromTool(tool: TodoToolLike | undefined): string[] {
  if (!tool) return []
  const result = asRecord(tool.result)
  const args = asRecord(tool.args)
  const raw = Array.isArray(result.todos)
    ? result.todos
    : Array.isArray(args.todos)
      ? args.todos
      : []
  const statuses: string[] = []
  for (const item of raw) {
    if (typeof item === "string") {
      if (item.trim()) statuses.push("pending")
      continue
    }
    const record = asRecord(item)
    const title = String(record.title ?? record.content ?? "").trim()
    if (!title) continue
    statuses.push(normalizeStatus(String(record.status ?? "")))
  }
  return statuses
}

function normalizeStatus(value: string): string {
  if (value === "completed" || value === "done") return "completed"
  if (value === "in_progress" || value === "in-progress" || value === "running") {
    return "in_progress"
  }
  return "pending"
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
