/**
 * Agent Step Tree 解析器：思考按工具切开，搜索带域名胶囊，阅读带 Explored pages。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { asRecord } from "../../../../lib/record.ts"
import { formatToolName, summarizeToolArgs, toolKind } from "../tool-summary.ts"
import type { AgentStepNode } from "./agent-step-tree.types.ts"
import type { TranslateFn } from "../../../../i18n/use-i18n.ts"
import { splitReasoningAroundTools } from "./split-reasoning-around-tools.ts"
import { groupConsecutiveSteps } from "./agent-step-group.ts"
import { extractDomainPills } from "./extract-domain-pills.ts"
import {
  extractCommandString,
  extractFilePaths,
  extractToolPath,
  inputRecords,
  mapToolStatus
} from "./extract-step-fields.ts"

const MAX_THINKING_CHARS = 1200

export function parseAgentStepNodes(
  reasoning: string,
  tools: ThreadToolCall[],
  t: TranslateFn
): AgentStepNode[] {
  const nodes: AgentStepNode[] = []
  let thinkIndex = 0

  for (const item of splitReasoningAroundTools(reasoning, tools)) {
    if (item.kind === "think") {
      nodes.push({
        id: `step_reasoning_${thinkIndex}`,
        kind: "thinking",
        title: thinkingTitle(item.text, t),
        status: "completed",
        rawText: clampThinkingText(item.text)
      })
      thinkIndex += 1
      continue
    }
    const node = mapToolToStepNode(item.tool, t)
    if (node) nodes.push(node)
  }

  return groupConsecutiveSteps(nodes, t)
}

function parseToolArguments(tool: ThreadToolCall): Record<string, unknown> {
  const records = inputRecords(tool.args, tool.argsText)
  const merged: Record<string, unknown> = {}
  for (let i = records.length - 1; i >= 0; i--) {
    Object.assign(merged, records[i])
  }
  return merged
}

function mapToolToStepNode(tool: ThreadToolCall, t: TranslateFn): AgentStepNode | null {
  const args = parseToolArguments(tool)
  const result = asRecord(tool.result)
  const command = extractCommandString(tool)
  const name = tool.name.toLowerCase()
  if (isSearchTool(tool, name)) return searchNode(tool, args, result, command, t)
  if (isEditTool(name, args, result)) return editNode(tool, args, result, command, t)
  if (isReadTool(name, args, tool.name, result)) return readNode(tool, args, result, command, t)
  if (isBashTool(name, command)) return commandNode(tool, command, args, result, t)
  return fallbackNode(tool, command, args, t)
}

function isBashTool(name: string, command: string | undefined): boolean {
  if (name === "bash" || name === "sh" || name === "terminal" || name === "code_mode") return true
  if (name === "command" || name === "cmd" || name === "execute") return Boolean(command)
  return Boolean(command) && (name.includes("bash") || name.includes("shell") || name.includes("terminal"))
}

function isSearchTool(tool: ThreadToolCall, name: string): boolean {
  return (
    toolKind(tool.name) === "search" ||
    name.includes("search") ||
    name === "grep" ||
    name === "glob"
  )
}

function isEditTool(name: string, args: Record<string, unknown>, result: Record<string, unknown>): boolean {
  if (name.includes("write") || name.includes("edit") || name.includes("patch") || name.includes("strreplace")) {
    return true
  }
  const path = String(args.path || args.file || "")
  const hasEdit = Boolean(
    args.content || args.diff || args.patch || args.replacement || args.edits || result.diff || result.patch
  )
  return Boolean(path) && hasEdit
}

function isReadTool(name: string, args: Record<string, unknown>, toolName: string, result: Record<string, unknown>): boolean {
  if (name.includes("read") || name.includes("fetch") || name.includes("list") || /^read\b/i.test(toolName)) {
    return true
  }
  if (typeof result.content === "string" && !result.diff && !result.patch) {
    return true
  }
  return Boolean(extractToolPath(args, toolName, result))
}

function commandNode(
  tool: ThreadToolCall,
  command: string | undefined,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
  t: TranslateFn
): AgentStepNode {
  const cmd = command || (isWeakCommandName(tool.name) ? "" : tool.name)
  const display = cmd
    ? cmd.length > 70
      ? `$ ${cmd.slice(0, 68)}...`
      : `$ ${cmd}`
    : t("chat.ranACommand")
  const exitCode = typeof result.exitCode === "number" ? result.exitCode : undefined
  const pills = extractDomainPills(args, result, cmd)
  return {
    id: tool.id,
    kind: "command",
    title: display,
    ...ioFields(tool, cmd || command, result),
    domainPills: pills.length > 0 ? pills : undefined,
    status: exitCode !== undefined && exitCode !== 0 ? "error" : mapToolStatus(tool.state)
  }
}

function searchNode(
  tool: ThreadToolCall,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
  command: string | undefined,
  t: TranslateFn
): AgentStepNode {
  const query = String(args.query || args.pattern || summarizeToolArgs(tool) || "context")
  const title =
    query.length > 50
      ? t("chat.searchingQueryMore", { query: query.slice(0, 50) })
      : t("chat.searchingQuery", { query })
  const pills = extractDomainPills(args, result, command)
  return {
    id: tool.id,
    kind: "search",
    title,
    status: mapToolStatus(tool.state),
    domainPills: pills.length > 0 ? pills : undefined
  }
}

function isWeakCommandName(name: string): boolean {
  return /^(command|cmd|tool|function|call|execute|exec|bash|sh)$/i.test(name)
}

function editNode(
  tool: ThreadToolCall,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
  command: string | undefined,
  t: TranslateFn
): AgentStepNode {
  const path = extractToolPath(args, tool.name, result)
  const parts = path.split(/[\\/]/)
  const leaf = parts.pop() || ""
  const fileName = leaf && !isGenericVerb(leaf) ? leaf : ""
  const fileDir = parts.length > 0 ? `${parts.join("/")}/` : ""
  const writing = tool.name.toLowerCase().includes("write")
  const verb = writing ? t("chat.verbWrite") : t("chat.verbEdit")
  return {
    id: tool.id,
    kind: "editing",
    title: fileName ? `${verb} ${fileName}` : path ? `${verb} ${path}` : verb,
    filePath: path || undefined,
    fileName: fileName || "",
    fileDir: fileDir || undefined,
    actionVerb: writing ? t("chat.verbWrite") : t("chat.verbEdit"),
    ...ioFields(tool, command, result),
    additions: typeof result.additions === "number" ? result.additions : undefined,
    deletions: typeof result.deletions === "number" ? result.deletions : undefined,
    status: mapToolStatus(tool.state)
  }
}

function readNode(
  tool: ThreadToolCall,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
  command: string | undefined,
  t: TranslateFn
): AgentStepNode {
  const exploredPages = extractFilePaths(args, result, t)
  const path =
    extractToolPath(args, tool.name, result) ||
    String(args.url || "")
  const parts = path.split(/[\\/]/)
  const leafName = parts.pop() || path
  const fileDir = parts.length > 0 ? `${parts.join("/")}/` : ""
  const pills = extractDomainPills(args, result, command)
  return {
    id: tool.id,
    kind: "reading",
    title: path ? t("chat.readName", { name: leafName }) : t("chat.readingResources"),
    filePath: path || undefined,
    fileName: leafName || undefined,
    fileDir: fileDir || undefined,
    actionVerb: t("chat.verbRead"),
    ...ioFields(tool, command, result),
    exploredPages: exploredPages.length > 1 ? exploredPages : undefined,
    exploredTitle: exploredPages.length > 1 ? t("chat.exploredPages", { count: exploredPages.length }) : undefined,
    domainPills: pills.length > 0 ? pills : undefined,
    status: mapToolStatus(tool.state)
  }
}

function fallbackNode(
  tool: ThreadToolCall,
  command: string | undefined,
  args: Record<string, unknown>,
  t: TranslateFn
): AgentStepNode {
  const rawPath = extractToolPath(args, tool.name) || String(args.url || "")
  let title = formatToolName(tool.name)
  if (isWeakCommandName(title) || !title) {
    title = command ? `$ ${command.slice(0, 60)}` : rawPath ? rawPath.split(/[\\/]/).pop() || rawPath : t("chat.ranACommand")
  }
  return {
    id: tool.id,
    kind: "command",
    title,
    detail: command && command.length > 80 ? `${command.slice(0, 80)}...` : command,
    status: mapToolStatus(tool.state)
  }
}

function ioFields(tool: ThreadToolCall, command: string | undefined, result: Record<string, unknown>) {
  const output =
    typeof result.output === "string"
      ? result.output
      : typeof result.stdout === "string"
        ? result.stdout
        : typeof result.stderr === "string"
          ? result.stderr
          : undefined
  return {
    command,
    output,
    exitCode: typeof result.exitCode === "number" ? result.exitCode : undefined,
    errorText: tool.errorText || (typeof result.error === "string" ? result.error : undefined)
  }
}

function thinkingTitle(text: string, t: TranslateFn): string {
  const line = text.trim().split(/\n/)[0]?.replace(/\s+/g, " ").trim() ?? ""
  if (!line) return t("chat.reasoningProcess")
  return line.length > 72 ? `${line.slice(0, 70)}…` : line
}

function clampThinkingText(text: string): string {
  if (text.length <= MAX_THINKING_CHARS) return text
  const cut = text.slice(0, MAX_THINKING_CHARS)
  const breakAt = cut.lastIndexOf("\n")
  const head = breakAt > 400 ? cut.slice(0, breakAt) : cut
  return `${head.trimEnd()}\n…`
}

function isGenericVerb(text: string): boolean {
  return /^(编辑|写入|读取|创建|修改|删除|运行|edit|write|read|create|modify|delete|run|file|folder|command)$/i.test(text.trim())
}
