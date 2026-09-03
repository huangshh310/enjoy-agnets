/**
 * ToolLoop 注册的内置工具名（含 delegate）。检查器快照用，不实例化工具。
 */
import { READ_TOOL_NAMES } from "./read-tools.ts"

export const CODING_TOOL_NAMES = [
  ...READ_TOOL_NAMES,
  "todo_write",
  "edit_file",
  "write_file",
  "bash",
  "git_status",
  "git_diff",
  "git_commit",
  "code_mode",
  "delegate"
] as const
