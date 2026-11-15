/**
 * 无 path 待验收占位：先从落库 / run.tools 认工具种类，认不出才走未知回退。
 * 未知回退禁止说「运行了命令」。中途中断不说「已改」。
 */
import {
  RESTART_ABANDONED_CODE,
  USER_ABORTED_CODE,
  toolHasResultCode
} from "@enjoy-agents/ipc-contract/desktop-notify"
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

type PlaceholderTool = { id?: string; name: string; state?: string; errorText?: string; result?: unknown; args?: unknown }

/** E1 M2：停止收尾回执给出的逐工具结论（只看三种落定；收尾中 / 卡住时验收条本就不出）。 */
export type StopVerdictOf = (toolCallId: string) => string | null

export function reviewPlaceholderKind(
  allTools: ReadonlyArray<PlaceholderTool>,
  interrupted = false,
  stopVerdictOf?: StopVerdictOf
): ReviewPlaceholderKind {
  // E1 M2（设计 §1.3）：回执确认「没有写入」的工具不算进这一轮；「这一步已做完再被停」按已执行的写类走；
  // 只有「可能只做了一半」才保留「可能改了文件，请核对」。
  const verdictOf = (tool: PlaceholderTool) => (tool.id && stopVerdictOf ? stopVerdictOf(tool.id) : null)
  const tools = allTools.filter((tool) => verdictOf(tool) !== "none_confirmed")
  const completed = tools.filter((tool) => verdictOf(tool) === "completed")
  if (completed.length > 0 && !interrupted && !tools.some((tool) => verdictOf(tool) !== "completed" && isInterruptedTool(tool))) {
    if (completed.some((tool) => FILE_WRITE_NAMES.has(tool.name)) || tools.some((tool) => !isToolNotExecuted(tool) && FILE_WRITE_NAMES.has(tool.name))) return "files"
    if (completed.some((tool) => COMMAND_NAMES.has(tool.name))) return "command"
  }
  const interruptedNow =
    interrupted || tools.some((tool) => verdictOf(tool) !== "completed" && isInterruptedTool(tool))
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
  // E1 D5：用户停掉时被 seal 的工具（result.code=user_aborted）也是中断，不当已执行判成「这一轮改了文件」。
  if (toolHasResultCode(tool, USER_ABORTED_CODE)) return true
  const text = tool.errorText ?? ""
  return isRestoreFamilyCode(text)
}
