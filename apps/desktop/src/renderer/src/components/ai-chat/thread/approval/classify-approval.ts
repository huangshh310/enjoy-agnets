/**
 * 把即将审批的工具分成 AICSS 三种表面：command / plan / questions。
 * 写盘优先 plan；ACP 弱名 / argv 走 command；禁止「有 args.command 就当 shell」。
 * 不引用 @renderer 别名，方便 node:test 直接跑。
 */
import { desktopActApprovalText } from "@enjoy-agents/agent-core/computer-use"
import type { ApprovalVariant } from "./approval.types"

const COMMAND_TOOLS = new Set([
  "bash",
  "sh",
  "execute_command",
  "run_command",
  "code_mode",
  "command",
  "cmd",
  "execute",
  "exec",
  "terminal"
])
const PLAN_TOOLS = new Set(["write_file", "write", "edit_file", "edit", "git_commit", "git_push"])
const PAYLOAD_LIMIT = 600

export function readArg(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  return typeof value === "string" ? value : ""
}

export function classifyApproval(name: string, args: Record<string, unknown>): ApprovalVariant {
  const tool = name.toLowerCase()
  if (COMMAND_TOOLS.has(tool)) return "command"
  if (PLAN_TOOLS.has(tool)) return "plan"
  if (looksLikeShell(name, args)) return "command"
  return "questions"
}

/** argv、名字/命令里的管道空格；MCP 单字段 command 且无 shell 句法不算。 */
export function looksLikeShell(name: string, args: Record<string, unknown>): boolean {
  if (hasArgv(args)) return true
  if (hasShellPunctuation(name)) return true
  const command = readArg(args, "command")
  return Boolean(command) && hasShellPunctuation(command)
}

export function commandTextOf(name: string, args: Record<string, unknown>): string {
  const command = readArg(args, "command")
  if (command) return command
  const argvText = argvTextOf(args)
  if (argvText) return argvText
  return COMMAND_TOOLS.has(name.toLowerCase()) ? "" : name
}

export function commandCwdOf(args: Record<string, unknown>, workspaceRoot: string): string {
  return readArg(args, "cwd") || readArg(args, "workdir") || workspaceRoot
}

export function filePathOfArgs(args: Record<string, unknown>): string {
  return readArg(args, "path") || readArg(args, "file_path")
}

/** questions 表面用的参数预览；桌面动作用一句话，空对象不展示。 */
export function payloadPreview(args: Record<string, unknown>, limit = PAYLOAD_LIMIT): string {
  if (typeof args.observationId === "string" && typeof args.action === "string") {
    return desktopActApprovalText(args).slice(0, limit)
  }
  if (Object.keys(args).length === 0) return ""
  const text = JSON.stringify(args, null, 2)
  return text.length <= limit ? text : `${text.slice(0, limit)}\n…`
}

function hasArgv(args: Record<string, unknown>): boolean {
  return Array.isArray(args.argv) && args.argv.length > 0
}

function argvTextOf(args: Record<string, unknown>): string {
  const argv = args.argv
  if (!Array.isArray(argv) || !argv.every((item) => typeof item === "string")) return ""
  return argv.join(" ")
}

function hasShellPunctuation(text: string): boolean {
  return text.includes(" ") || text.includes("&&") || text.includes(";") || /[\n|]/.test(text)
}
