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
        title: t("chat.reasoningProcess"),
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

function mapToolToStepNode(tool: ThreadToolCall, t: TranslateFn): AgentStepNode | null {
  const args = asRecord(tool.args)
  const result = asRecord(tool.result)
  const command = extractCommandString(tool)
  const name = tool.name.toLowerCase()
  if (isBashTool(name, command)) return commandNode(tool, command, args, result)
  if (isSearchTool(tool, name)) return searchNode(tool, args, result, command, t)
  if (isEditTool(name, args, result)) return editNode(tool, args, result, command, t)
  if (isReadTool(name, args)) return readNode(tool, args, result, command, t)
  return fallbackNode(tool, command, args)
}

function isBashTool(name: string, command: string | undefined): boolean {
  if (name === "bash" || name === "command" || name === "terminal" || name === "code_mode" || name === "sh") {
    return true
  }
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
    args.content || args.diff || args.patch || args.replacement || args.edits || result.diff || result.content
  )
  return Boolean(path) && hasEdit
}

function isReadTool(name: string, args: Record<string, unknown>): boolean {
  if (name.includes("read") || name.includes("fetch") || name.includes("list")) return true
  return Boolean(args.path || args.file || args.url || args.file_path)
}

function commandNode(
  tool: ThreadToolCall,
  command: string | undefined,
  args: Record<string, unknown>,
  result: Record<string, unknown>
): AgentStepNode {
  const cmd = command || summarizeToolArgs(tool) || ""
  const display = cmd ? (cmd.length > 70 ? `$ ${cmd.slice(0, 68)}...` : `$ ${cmd}`) : `$ ${tool.name}`
  const exitCode = typeof result.exitCode === "number" ? result.exitCode : undefined
  const pills = extractDomainPills(args, result, cmd)
  return {
    id: tool.id,
    kind: "command",
    title: display,
    ...ioFields(tool, command, result),
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

function editNode(
  tool: ThreadToolCall,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
  command: string | undefined,
  t: TranslateFn
): AgentStepNode {
  const path = String(args.path || args.file || "")
  const parts = path.split(/[\\/]/)
  const fileName = parts.pop() || path
  const fileDir = parts.length > 0 ? `${parts.join("/")}/` : ""
  const writing = tool.name.toLowerCase().includes("write")
  return {
    id: tool.id,
    kind: "editing",
    title: `${writing ? t("chat.verbWrite") : t("chat.verbEdit")} ${fileName}`,
    filePath: path,
    fileName,
    fileDir,
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
  const path = String(args.path || args.file || args.file_path || args.url || "")
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
  args: Record<string, unknown>
): AgentStepNode {
  const rawPath = String(args.path || args.file || args.url || "")
  let title = formatToolName(tool.name)
  if (!title || title.toLowerCase() === "tool" || title.toLowerCase() === "function") {
    title = command ? `$ ${command.slice(0, 60)}` : rawPath ? rawPath.split(/[\\/]/).pop() || rawPath : tool.name
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

function clampThinkingText(text: string): string {
  if (text.length <= MAX_THINKING_CHARS) return text
  const cut = text.slice(0, MAX_THINKING_CHARS)
  const breakAt = cut.lastIndexOf("\n")
  const head = breakAt > 400 ? cut.slice(0, breakAt) : cut
  return `${head.trimEnd()}\n…`
}
