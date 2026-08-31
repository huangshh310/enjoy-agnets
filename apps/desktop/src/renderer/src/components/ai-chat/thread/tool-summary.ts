/**
 * 工具调用展示用的名称、参数摘要与分类。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { asRecord, readString } from "@renderer/lib/record"

export function formatToolName(name: string) {
  return name.replaceAll("_", " ")
}

export function toolKind(name: string): "search" | "coding" | "other" {
  if (name === "grep" || name === "glob" || name === "list_dir") return "search"
  if (
    name === "bash" ||
    name === "edit_file" ||
    name === "write_file" ||
    name === "read_file" ||
    name === "git_diff" ||
    name === "git_status" ||
    name === "git_commit"
  ) {
    return "coding"
  }
  return "other"
}

export function summarizeToolArgs(tool: ThreadToolCall): string {
  const record = asRecord(tool.args)
  const fromArgs =
    readString(record, "path") ||
    readString(record, "pattern") ||
    readString(record, "command") ||
    readString(record, "glob")
  if (fromArgs) return fromArgs
  if (tool.argsText?.trim()) return tool.argsText.trim().slice(0, 96)
  return ""
}

export function parseToolArgs(tool: ThreadToolCall): unknown {
  if (tool.args !== undefined) return tool.args
  if (!tool.argsText?.trim()) return undefined
  try {
    return JSON.parse(tool.argsText)
  } catch {
    return { raw: tool.argsText }
  }
}
