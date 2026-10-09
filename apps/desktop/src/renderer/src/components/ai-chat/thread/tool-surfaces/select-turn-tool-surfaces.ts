/**
 * 助手轮工具表面：从本轮 tools 抽出 Todo List 与可画的 File Diff / Tool Result。
 * 不把 read_file 整文件 JSON 倒进对话框。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { asRecord, readString } from "../../../../lib/record.ts"
import { isTodoContinueUserMessage } from "../../composer/todo-continue-message.ts"
import { desktopActFailureKind } from "../desktop-act-failed-copy.ts"
import { isTodoWriteName } from "../thinking/agent-step-kind.ts"

export type TurnTodoItem = {
  id?: string
  title: string
  status: "pending" | "in_progress" | "completed"
}

export type TurnTodoList = {
  title?: string
  tasks: TurnTodoItem[]
}

/** 最后一次 todo_write 的完整任务表；流式入参也可画。 */
export function latestTodoList(tools: ThreadToolCall[]): TurnTodoList | null {
  for (let index = tools.length - 1; index >= 0; index--) {
    const tool = tools[index]
    if (!tool || !isTodoWriteName(tool.name)) continue
    const parsed = todosFromTool(tool)
    if (parsed.tasks.length > 0) return parsed
  }
  return null
}
/** edit/write/git_diff 的 unified diff。终端命令回显保留在思考链原位展示。 */
export function toolResultSurfaces(tools: ThreadToolCall[]): ThreadToolCall[] {
  return tools.filter(isRichToolResult)
}

export function desktopActFailedSurfaces(tools: ThreadToolCall[]): ThreadToolCall[] {
  return tools.filter((tool) => tool.name === "desktop_act" && desktopActFailureKind(tool))
}

export function hasTurnToolSurfaces(tools: ThreadToolCall[]): boolean {
  return toolResultSurfaces(tools).length > 0 || desktopActFailedSurfaces(tools).length > 0
}

/** 只取「最后一条非续跑用户消息之后」的 Todo List，避免新任务还挂旧表、续跑却把表藏掉。 */
export function latestSessionTodoList(
  messages: Array<{ role?: string; tools?: ThreadToolCall[] }>
): TurnTodoList | null {
  const afterUser = lastUserMessageIndex(messages)
  for (let index = messages.length - 1; index > afterUser; index--) {
    const list = latestTodoList(messages[index]?.tools ?? [])
    if (list) return list
  }
  return null
}

function lastUserMessageIndex(
  messages: Array<{ role?: string; content?: string }>
): number {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message?.role !== "user") continue
    if (isTodoContinueUserMessage(message.content)) continue
    return index
  }
  return -1
}

function isRichToolResult(tool: ThreadToolCall): boolean {
  if (isTodoWriteName(tool.name)) return false
  if (tool.state !== "output-available") return false
  const result = asRecord(tool.result)
  return Boolean(readString(result, "diff").trim())
}

function todosFromTool(tool: ThreadToolCall): TurnTodoList {
  const result = asRecord(tool.result)
  const args = asRecord(tool.args)
  const raw = Array.isArray(result.todos)
    ? result.todos
    : Array.isArray(args.todos)
      ? args.todos
      : []
  const title = readString(result, "title") || readString(args, "title")
  const tasks: TurnTodoItem[] = []
  for (const item of raw) {
    const task = asTodoItem(item)
    if (task) tasks.push(task)
  }
  return title ? { title, tasks } : { tasks }
}

function asTodoItem(value: unknown): TurnTodoItem | null {
  if (typeof value === "string") {
    const title = value.trim()
    return title ? { title, status: "pending" } : null
  }
  const record = asRecord(value)
  const title = readString(record, "title") || readString(record, "content")
  if (!title.trim()) return null
  return {
    id: readString(record, "id") || undefined,
    title: title.trim(),
    status: todoStatusOf(readString(record, "status"))
  }
}

function todoStatusOf(value: string): TurnTodoItem["status"] {
  if (value === "completed" || value === "done") return "completed"
  if (value === "in_progress" || value === "in-progress" || value === "running") {
    return "in_progress"
  }
  return "pending"
}
