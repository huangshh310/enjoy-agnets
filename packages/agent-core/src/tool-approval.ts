/**
 * AI SDK 7 ToolLoopAgent.toolApproval 决策，并译成 HarnessAgent 的 permissionMode / toolApproval。
 * 本机路径用函数看 bash 命令；Harness 的 toolApproval 是静态表，内置 write/edit/bash 走 permissionMode。
 */
import type { AgentMode, PermissionMode } from "@enjoy-agents/ipc-contract"
import { ASK_USER_QUESTIONS_TOOL } from "./tools/ask-user-questions-name.ts"

/** 本机工具名 + Claude Code 内置别名，Files 开关同时管两边。 */
export const WRITE_TOOLS = ["edit_file", "write_file", "write", "edit", "code_mode"] as const
export const BASH_TOOLS = ["bash", "code_mode"] as const
export const COMMIT_TOOLS = ["git_commit", "git_push"] as const
export const MUTATING_TOOLS = [...WRITE_TOOLS, ...BASH_TOOLS, ...COMMIT_TOOLS] as const

export type ApprovalPolicy = {
  requireWriteApproval: boolean
  requireBashApproval: boolean
  requireCommitApproval: boolean
  sessionApprovedTools?: ReadonlySet<string>
}

export type ToolApprovalDecision =
  | undefined
  | "not-applicable"
  | "approved"
  | "denied"
  | "user-approval"
  | { type: "not-applicable" }
  | { type: "approved"; reason?: string }
  | { type: "denied"; reason: string }
  | { type: "user-approval" }

const WRITE_SET = new Set<string>(WRITE_TOOLS)
const BASH_SET = new Set<string>(BASH_TOOLS)
const COMMIT_SET = new Set<string>(COMMIT_TOOLS)
const MUTATING_SET = new Set<string>(MUTATING_TOOLS)

/** Auto 下仍强制确认的高风险 shell，只做保守匹配。 */
const DANGEROUS_BASH = [
  /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/i,
  /\bgit\s+push\b[\s\S]*\s(-f|--force)\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bsudo\b/i,
  /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(bash|sh|zsh)\s*($|[;&|\s])/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i
]

/** 按模式、偏好和本次入参解析该自动跑、等人，还是拒绝。 */
export function resolveToolApproval(
  toolName: string,
  mode: AgentMode,
  policy: ApprovalPolicy,
  input?: unknown
): ToolApprovalDecision {
  if (toolName === ASK_USER_QUESTIONS_TOOL) return "user-approval"
  if (toolName.startsWith("mcp_")) return resolveMcpApproval(toolName, mode, policy)
  if (!MUTATING_SET.has(toolName)) return "not-applicable"
  if (mode === "ask" || mode === "plan") {
    return { type: "denied", reason: `${mode} mode is read-only.` }
  }
  // 会话放行不能越过高风险命令；Allow for session 之后 rm -rf 仍要停。
  if (BASH_SET.has(toolName) && isDangerousBash(bashCommandFrom(input))) {
    return "user-approval"
  }
  if (sessionAllows(toolName, policy.sessionApprovedTools)) return "approved"
  if (WRITE_SET.has(toolName) && !policy.requireWriteApproval) return "approved"
  if (BASH_SET.has(toolName) && !policy.requireBashApproval) return "approved"
  if (COMMIT_SET.has(toolName) && !policy.requireCommitApproval) return "approved"
  return "user-approval"
}

const MCP_WRITE_LEAF = /(write|delete|create|update|remove|put|patch|insert|drop|exec|kill|send)/i

export function mcpToolLeafName(toolName: string): string {
  return toolName.includes("__") ? toolName.slice(toolName.indexOf("__") + 2) : toolName
}

export function isMcpWriteToolName(toolName: string): boolean {
  return MCP_WRITE_LEAF.test(mcpToolLeafName(toolName))
}

function resolveMcpApproval(
  toolName: string,
  mode: AgentMode,
  policy: ApprovalPolicy
): ToolApprovalDecision {
  if ((mode === "ask" || mode === "plan") && isMcpWriteToolName(toolName)) {
    return { type: "denied", reason: `${mode} mode is read-only.` }
  }
  if (mode === "ask" || mode === "plan") return "not-applicable"
  if (sessionAllows(toolName, policy.sessionApprovedTools)) return "approved"
  if (isMcpWriteToolName(toolName)) return "user-approval"
  return "not-applicable"
}

function sessionAllows(toolName: string, session?: ReadonlySet<string>): boolean {
  if (!session) return false
  if (session.has(toolName)) return true
  if (WRITE_SET.has(toolName)) return WRITE_TOOLS.some((name) => session.has(name))
  return false
}

function bashCommandFrom(input: unknown): string {
  if (typeof input === "string") return input
  if (input && typeof input === "object" && "command" in input) {
    const command = (input as { command?: unknown }).command
    return typeof command === "string" ? command : ""
  }
  return ""
}

function isDangerousBash(command: string): boolean {
  const trimmed = command.trim()
  if (!trimmed) return false
  return DANGEROUS_BASH.some((pattern) => pattern.test(trimmed))
}

const HOST_READ_TOOLS = [
  "read_file",
  "list_dir",
  "glob",
  "grep",
  "git_status",
  "git_diff",
  "git_log",
  "read"
] as const

export type HarnessToolApprovalMap = Record<string, Exclude<ToolApprovalDecision, undefined>>

export type HarnessApprovalSettings = {
  permissionMode: PermissionMode
  toolApproval: HarnessToolApprovalMap
}

/** 生成 HarnessAgent({ permissionMode, toolApproval }) 的审批字段。 */
export function toHarnessApprovalSettings(
  mode: AgentMode,
  policy: ApprovalPolicy
): HarnessApprovalSettings {
  const readOnly = mode === "ask" || mode === "plan"
  const denied = { type: "denied" as const, reason: `${mode} mode is read-only.` }
  const write = readOnly ? denied : mutatingStatus(policy.requireWriteApproval)
  const bash = readOnly ? denied : mutatingStatus(policy.requireBashApproval)
  const commit = readOnly ? denied : mutatingStatus(policy.requireCommitApproval)
  const toolApproval: HarnessToolApprovalMap = {}
  for (const name of HOST_READ_TOOLS) toolApproval[name] = "not-applicable"
  for (const name of WRITE_TOOLS) toolApproval[name] = write
  for (const name of BASH_TOOLS) toolApproval[name] = bash
  for (const name of COMMIT_TOOLS) toolApproval[name] = commit
  applySessionApprovals(toolApproval, policy.sessionApprovedTools, readOnly)
  // ACP / Harness 没有 createCodingTools，不要登记 ask_user_questions。
  return { permissionMode: harnessPermissionMode(policy), toolApproval }
}

/**
 * 与 ipc-contract.toHarnessPermissionMode 同规则。
 * 测试跑 node:test 时加载不了 contract 入口（缺 .ts 扩展名），所以本地再写一遍。
 * 静态表看不了命令，allow-all 无法拦 rm -rf，Harness 最多发 allow-edits。
 */
function harnessPermissionMode(policy: ApprovalPolicy): PermissionMode {
  if (!policy.requireWriteApproval) return "allow-edits"
  return "allow-reads"
}

function applySessionApprovals(
  map: HarnessToolApprovalMap,
  session: ReadonlySet<string> | undefined,
  readOnly: boolean
): void {
  if (readOnly || !session) return
  const names = new Set(session)
  if (WRITE_TOOLS.some((name) => names.has(name))) {
    for (const name of WRITE_TOOLS) names.add(name)
  }
  for (const name of names) {
    const current = map[name]
    if (typeof current === "string" && current !== "denied") map[name] = "approved"
  }
}

function mutatingStatus(requireApproval: boolean): Exclude<ToolApprovalDecision, undefined> {
  return requireApproval ? "user-approval" : "approved"
}
