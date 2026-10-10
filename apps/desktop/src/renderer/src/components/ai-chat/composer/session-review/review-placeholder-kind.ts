/**
 * 无 path 待验收占位：先从落库 / run.tools 认工具种类，认不出才走未知回退。
 * 未知回退禁止说「运行了命令」。中途中断不说「已改」。
 */
import { RESTART_ABANDONED_CODE, toolHasResultCode } from "@enjoy-agents/ipc-contract/desktop-notify"
import { BASH_TOOLS, TOOL_NAMES } from "@enjoy-agents/ipc-contract/tool-names"
import { isRestoreFamilyCode } from "@enjoy-agents/ipc-contract/restore-codes"

export type ReviewPlaceholderKind = "files" | "command" | "maybe" | "unknown"

const FILE_WRITE_NAMES = new Set([
  TOOL_NAMES.writeFile,
  TOOL_NAMES.editFile,
  "write",
  "edit",
  "delete_file",
  "delete",
  "apply_patch",
  "str_replace",
  "strreplace"
])

const COMMAND_NAMES = new Set<string>([...BASH_TOOLS, TOOL_NAMES.gitCommit, "command", "cmd"])

export function reviewPlaceholderKey(kind: ReviewPlaceholderKind): string {
  if (kind === "files") return "chat.sessionReviewFilesPlaceholder"
  if (kind === "command") return "chat.sessionReviewCommandPlaceholder"
  if (kind === "maybe") return "chat.sessionReviewMaybeChanged"
  return "chat.sessionReviewUnknownPlaceholder"
}

export function reviewPlaceholderKind(
  tools: ReadonlyArray<{ name: string; state?: string; errorText?: string; result?: unknown }>,
  interrupted = false
): ReviewPlaceholderKind {
  if (interrupted || tools.some(isInterruptedTool)) return "maybe"
  if (tools.some((tool) => FILE_WRITE_NAMES.has(tool.name))) return "files"
  if (tools.some((tool) => COMMAND_NAMES.has(tool.name))) return "command"
  return "unknown"
}

function isInterruptedTool(tool: { state?: string; errorText?: string; result?: unknown }): boolean {
  if (tool.state === "approval-requested") return true
  if (toolHasResultCode(tool, RESTART_ABANDONED_CODE)) return true
  const text = tool.errorText ?? ""
  return isRestoreFamilyCode(text)
}
