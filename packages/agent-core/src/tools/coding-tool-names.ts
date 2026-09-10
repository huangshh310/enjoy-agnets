/**
 * ToolLoop 注册的内置工具名（含 delegate）。检查器快照用，不实例化工具。
 */
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import { READ_TOOL_NAMES } from "./read-tools.ts"

export const CODING_TOOL_NAMES = [
  ...READ_TOOL_NAMES,
  "todo_write",
  "ask_user_questions",
  "skill",
  "edit_file",
  "write_file",
  "bash",
  "git_status",
  "git_diff",
  "git_log",
  "git_commit",
  "git_push",
  "git_branch",
  "code_mode",
  "delegate"
] as const

const READ_ONLY_TOOL_NAMES = [
  ...READ_TOOL_NAMES,
  "todo_write",
  "ask_user_questions",
  "skill",
  "git_status",
  "git_diff",
  "git_log",
  "delegate"
] as const

/** plan/ask 不注册写盘与 shell；审批层仍会 deny，防止漏网。 */
export function isReadOnlyAgentMode(mode: AgentMode): boolean {
  return mode === "plan" || mode === "ask"
}

/** 与 createCodingAgent 实际注册的名字对齐（含 delegate，不含 MCP）。 */
export function codingToolNamesFor(
  mode: AgentMode,
  options?: { includeAskUser?: boolean }
): string[] {
  const names: string[] = isReadOnlyAgentMode(mode)
    ? [...READ_ONLY_TOOL_NAMES]
    : [...CODING_TOOL_NAMES]
  if (mode === "plan") names.push("submit_plan")
  if (options?.includeAskUser === false) {
    return names.filter((name) => name !== "ask_user_questions")
  }
  return names
}
