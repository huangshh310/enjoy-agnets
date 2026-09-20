/**
 * 弱名 command 的 kind：argv/command 为 bash，content/diff 为 edit，path 为 read。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { toolKind } from "../tool-summary.ts"
import { extractToolPath } from "./extract-step-fields.ts"

export function isSearchTool(tool: ThreadToolCall, name: string): boolean {
  return toolKind(tool.name) === "search" || name.includes("search") || name === "grep" || name === "glob"
}

export function isBashTool(name: string, shell?: string): boolean {
  if (name === "bash" || name === "sh" || name === "terminal" || name === "code_mode") return true
  if (name === "command" || name === "cmd" || name === "execute") return Boolean(shell)
  return Boolean(shell) && (name.includes("bash") || name.includes("shell") || name.includes("terminal"))
}

/** 任务清单不是磁盘写入；Composer 任务坞已经画过。 */
export function isTodoWriteName(name: string): boolean {
  const n = name.trim().toLowerCase().replace(/[\s-]/g, "_")
  return n === "todo_write" || n === "todo" || n === "update_todos"
}

export function isEditTool(
  name: string,
  args: Record<string, unknown>,
  result: Record<string, unknown>
): boolean {
  if (isTodoWriteName(name)) return false
  if (name.includes("write") || name.includes("edit") || name.includes("patch") || name.includes("strreplace")) {
    return true
  }
  const hasEdit = Boolean(
    args.content || args.diff || args.patch || args.replacement || args.edits || result.diff || result.patch
  )
  return Boolean(extractToolPath(args, name)) && hasEdit
}

export function isReadTool(name: string, args: Record<string, unknown>, toolName: string): boolean {
  if (name.includes("read") || name.includes("fetch") || name.includes("list") || /^read\b/i.test(toolName)) {
    return true
  }
  return Boolean(extractToolPath(args, toolName))
}

export function isWeakCommandName(name: string): boolean {
  return /^(command|cmd|tool|function|call|execute|exec|bash|sh)$/i.test(name)
}

/** ACP Task 在 map-events 里先归一成 delegate；解析器只认工具名。 */
export function isDelegateToolName(name: string): boolean {
  return /^(delegate|task)$/i.test(name.trim())
}
