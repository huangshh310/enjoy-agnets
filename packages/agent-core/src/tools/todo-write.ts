// @ts-nocheck — 与 createCodingTools 相同：Zod 4 + AI SDK Tool 泛型。
/**
 * 对话内 Todo List：整表替换当前任务板，不写盘、不跑 shell。
 */
import { tool } from "ai"
import { z } from "zod"

export const TODO_STATUSES = ["pending", "in_progress", "completed"] as const

export type TodoStatus = (typeof TODO_STATUSES)[number]

export type TodoWriteItem = {
  id: string
  title: string
  status: TodoStatus
}

export type TodoWriteResult = {
  title?: string
  todos: TodoWriteItem[]
}

/** 把模型入参收成 UI 能画的任务表；空标题丢掉。 */
export function normalizeTodoWrite(input: {
  title?: string
  todos: Array<{ id?: string; title?: string; status?: string }>
}): TodoWriteResult {
  const todos: TodoWriteItem[] = []
  for (let index = 0; index < input.todos.length; index++) {
    const item = input.todos[index]
    const title = item?.title?.trim() ?? ""
    if (!title) continue
    todos.push({
      id: item.id?.trim() || `todo_${index + 1}`,
      title,
      status: normalizeTodoStatus(item.status)
    })
  }
  const title = input.title?.trim()
  return title ? { title, todos } : { todos }
}

function normalizeTodoStatus(value: string | undefined): TodoStatus {
  if (value === "completed" || value === "done") return "completed"
  if (value === "in_progress" || value === "in-progress" || value === "running") {
    return "in_progress"
  }
  return "pending"
}

export function createTodoWriteTool() {
  return {
    todo_write: tool({
      description:
        "Replace the Todo List shown in chat. Pass the full current list. Not a workspace mutation. Use for multi-step work and keep exactly one item in_progress.",
      inputSchema: z.object({
        title: z.string().optional().describe("Short plan title"),
        todos: z.array(
          z.object({
            id: z.string().optional(),
            title: z.string().describe("Task title"),
            status: z.enum(["pending", "in_progress", "completed"]).optional()
          })
        )
      }),
      execute: async ({ title, todos }) => normalizeTodoWrite({ title, todos })
    })
  }
}
