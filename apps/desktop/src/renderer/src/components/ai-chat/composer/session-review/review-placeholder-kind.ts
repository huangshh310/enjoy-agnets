/**
 * 无 path 待验收占位：先从落库 / run.tools 认工具种类，认不出才走未知回退。
 * 未知回退禁止说「运行了命令」。中途中断不说「已改」。
 */
import { RESTART_ABANDONED_CODE, toolHasResultCode } from "@enjoy-agents/ipc-contract/desktop-notify"
import { BASH_TOOLS, TOOL_NAMES } from "@enjoy-agents/ipc-contract/tool-names"
import { isRestoreFamilyCode } from "@enjoy-agents/ipc-contract/restore-codes"
import { isToolNotExecuted } from "@enjoy-agents/ipc-contract/approval-not-executed"
import { isWriteTypeToolName } from "@enjoy-agents/ipc-contract/tool-names"
import { isReadOnlyBashTool } from "@enjoy-agents/ipc-contract/bash-read-only"

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

function toolMayHaveWritten(tool: { name: string; args?: unknown }): boolean {
  return isWriteTypeToolName(tool.name) && !isReadOnlyBashTool(tool)
}

export function reviewPlaceholderKind(
  tools: ReadonlyArray<{ name: string; state?: string; errorText?: string; result?: unknown; args?: unknown }>,
  interrupted = false
): ReviewPlaceholderKind {
  const interruptedNow = interrupted || tools.some(isInterruptedTool)
  // luna / #150：中断了但只出现过只读工具（ls 等）→ 不说「可能改了文件」。
  if (interruptedNow) {
    return tools.some(toolMayHaveWritten) ? "maybe" : "unknown"
  }
  // 拒绝 / 未执行的工具不算「运行了命令」「改了文件」。
  const acted = tools.filter((tool) => !isToolNotExecuted(tool))
  if (acted.some((tool) => FILE_WRITE_NAMES.has(tool.name))) return "files"
  if (acted.some((tool) => COMMAND_NAMES.has(tool.name))) return "command"
  return "unknown"
}

function isInterruptedTool(tool: { state?: string; errorText?: string; result?: unknown }): boolean {
  if (tool.state === "approval-requested") return true
  if (toolHasResultCode(tool, RESTART_ABANDONED_CODE)) return true
  const text = tool.errorText ?? ""
  return isRestoreFamilyCode(text)
}
