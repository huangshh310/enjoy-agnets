/**
 * Agent Step Tree 解析器：思考按工具切开，搜索带域名胶囊，阅读带 Explored pages。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { asRecord } from "../../../../lib/record.ts"
import { formatToolLabel, formatToolName, summarizeToolArgs } from "../tool-summary.ts"
import type { AgentStepNode } from "./agent-step-tree.types.ts"
import type { TranslateFn } from "../../../../i18n/use-i18n.ts"
import { commandStreamText } from "./command-stream-text.ts"
import { splitReasoningAroundTools } from "./split-reasoning-around-tools.ts"
import { groupConsecutiveSteps } from "./agent-step-group.ts"
import { nestChildSteps } from "./agent-step-nest.ts"
import { extractDomainPills } from "./extract-domain-pills.ts"
import { isBashTool, isDelegateToolName, isEditTool, isReadTool, isSearchTool, isWeakCommandName } from "./agent-step-kind.ts"
import { mapDelegateToStepNode } from "./delegate-step.ts"
import { isGenericVerb } from "./is-generic-verb.ts"
import {
  desktopActFailedCopy,
  desktopActFailureKind,
  desktopActUserErrorText
} from "../desktop-act-failed-copy.ts"
import { toolAbortKind } from "@enjoy-agents/ipc-contract/desktop-notify"
import { isDeniedTool, isSkippedTool, toolDeniedCopy } from "../tool-denied-copy.ts"
import {
  extractCommandString,
  extractFilePaths,
  extractShellCommand,
  extractToolPath,
  mergeToolArgs,
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
    if (node) nodes.push(stampDenied(node, item.tool))
  }

  return groupConsecutiveSteps(nestChildSteps(nodes, tools), t)
}

function stampDenied(node: AgentStepNode, tool: ThreadToolCall): AgentStepNode {
  if (isSkippedTool(tool)) return { ...node, status: "skipped", denied: false }
  return tool.state === "output-denied" ? { ...node, denied: true } : node
}

function mapToolToStepNode(tool: ThreadToolCall, t: TranslateFn): AgentStepNode | null {
  if (isDelegateToolName(tool.name)) return mapDelegateToStepNode(tool, t)
  const args = mergeToolArgs(tool)
  const result = asRecord(tool.result)
  const shell = extractShellCommand(tool)
  const command = shell ?? extractCommandString(tool)
  const name = tool.name.toLowerCase()
  if (isSearchTool(tool, name)) return searchNode(tool, args, result, command, t)
  if (isBashTool(name, shell)) return commandNode(tool, shell, args, result, t)
  if (isEditTool(name, args, result)) return editNode(tool, args, result, command, t)
  if (isReadTool(name, args, tool.name)) return readNode(tool, args, result, command, t)
  return fallbackNode(tool, shell, args, result, t)
}

function commandNode(
  tool: ThreadToolCall,
  shell: string | undefined,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
  t: TranslateFn
): AgentStepNode {
  const display = shellTitle(shell, t)
  const exitCode = typeof result.exitCode === "number" ? result.exitCode : undefined
  const pills = extractDomainPills(args, result, shell)
  return {
    id: tool.id,
    kind: "command",
    title: display,
    ...ioFields(tool, shell, result, t),
    domainPills: pills.length > 0 ? pills : undefined,
    status: exitCode !== undefined && exitCode !== 0 ? "error" : mapToolStatus(tool.state, tool)
  }
}

function shellTitle(shell: string | undefined, t: TranslateFn): string {
  if (!shell) return t("chat.ranACommand")
  return shell.length > 70 ? `$ ${shell.slice(0, 68)}...` : `$ ${shell}`
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
    status: mapToolStatus(tool.state, tool),
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
    ...ioFields(tool, command, result, t),
    additions: typeof result.additions === "number" ? result.additions : undefined,
    deletions: typeof result.deletions === "number" ? result.deletions : undefined,
    status: mapToolStatus(tool.state, tool)
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
    ...ioFields(tool, command, result, t),
    exploredPages: exploredPages.length > 1 ? exploredPages : undefined,
    exploredTitle: exploredPages.length > 1 ? t("chat.exploredPages", { count: exploredPages.length }) : undefined,
    domainPills: pills.length > 0 ? pills : undefined,
    status: mapToolStatus(tool.state, tool)
  }
}

function fallbackNode(
  tool: ThreadToolCall,
  shell: string | undefined,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
  t: TranslateFn
): AgentStepNode {
  if (toolAbortKind(tool) === "neutral") {
    return {
      id: tool.id,
      kind: "command",
      title: formatToolName(tool.name),
      errorText: t("studio.automations.catchUpTimeout"),
      status: "skipped"
    }
  }
  if (isSkippedTool(tool)) {
    return {
      id: tool.id,
      kind: "command",
      title: formatToolName(tool.name),
      errorText: toolDeniedCopy(t, tool),
      status: "skipped"
    }
  }
  if (isDeniedTool(tool)) {
    return {
      id: tool.id,
      kind: "command",
      // 必须用已 import 的 formatToolName；合入时丢过 import，ThinkingTrace 同步 parse 会白屏。
      title: formatToolName(tool.name),
      errorText: toolDeniedCopy(t, tool),
      status: "denied"
    }
  }
  const failed = desktopActFailureKind(tool) ?? desktopActFailureKind(result)
  if (failed) {
    const copy = desktopActFailedCopy(failed, t)
    return {
      id: tool.id,
      kind: "command",
      title: copy.title,
      errorText: copy.body,
      status: "error"
    }
  }
  const rawPath = extractToolPath(args, tool.name) || String(args.url || "")
  let title = formatToolLabel(tool.name, t, args)
  if (isWeakCommandName(title) || !title) {
    title = shell ? shellTitle(shell, t) : rawPath ? rawPath.split(/[\\/]/).pop() || rawPath : t("chat.ranACommand")
  }
  return {
    id: tool.id,
    kind: "command",
    title,
    detail: shell && shell.length > 80 ? `${shell.slice(0, 80)}...` : shell,
    status: mapToolStatus(tool.state, tool)
  }
}

function ioFields(
  tool: ThreadToolCall,
  command: string | undefined,
  result: Record<string, unknown>,
  t: TranslateFn
) {
  const stdout = commandStreamText(result, "stdout")
  const stderr = commandStreamText(result, "stderr")
  const output =
    typeof result.output === "string"
      ? result.output
      : stdout
        ? stdout
        : stderr
          ? stderr
          : undefined
  if (isDeniedTool(tool) || isSkippedTool(tool)) {
    return { command, output, exitCode: undefined, errorText: toolDeniedCopy(t, tool) }
  }
  const raw = tool.errorText || (typeof result.error === "string" ? result.error : undefined)
  return {
    command,
    output,
    exitCode: typeof result.exitCode === "number" ? result.exitCode : undefined,
    errorText: desktopActUserErrorText(tool, raw, t)
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
