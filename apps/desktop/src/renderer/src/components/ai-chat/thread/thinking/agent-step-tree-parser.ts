/**
 * Agent Step Tree 数据解析器：
 * 将真实 tools 调用与 reasoning 解析为带域名微标 (Domain Pills) 与子页面清单 (Explored Pages) 的结构化步骤树。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { asRecord } from "@renderer/lib/record"
import { formatToolName, summarizeToolArgs, toolKind } from "../tool-summary"
import type { AgentStepNode, DomainPill, SubPageItem } from "./agent-step-tree.types"

/** 提取文本或 JSON 中的所有网址与顶级域名 */
function extractDomains(text: string): DomainPill[] {
  const urlRegex = /(?:https?:\/\/)?([a-zA-Z0-9.-]+\.(?:com|org|net|io|dev|ai|app|cn|me|so|in|cc|edu|gov)(?:\/[^\s"'\\]*)?)/gi
  const matches = Array.from(text.matchAll(urlRegex))
  const pills: DomainPill[] = []
  const seen = new Set<string>()

  for (const m of matches) {
    const raw = m[1] ?? ""
    if (!raw) continue
    const domain = raw.split(/[/?#]/)[0]?.toLowerCase() ?? ""
    if (!domain || domain.length < 3 || seen.has(domain)) continue
    seen.add(domain)

    const fullUrl = raw.startsWith("http") ? raw : `https://${raw}`
    pills.push({
      id: `domain_${pills.length}_${domain}`,
      label: domain,
      url: fullUrl
    })
  }

  return pills
}

/** 提取文件名或路径列表 */
function extractFilePaths(args: Record<string, unknown>, result: Record<string, unknown>): SubPageItem[] {
  const pages: SubPageItem[] = []
  const candidates: string[] = []

  if (typeof args.path === "string") candidates.push(args.path)
  if (typeof args.file === "string") candidates.push(args.file)
  if (typeof args.url === "string") candidates.push(args.url)
  if (Array.isArray(args.files)) candidates.push(...args.files.filter((f): f is string => typeof f === "string"))
  if (Array.isArray(result.files)) candidates.push(...result.files.filter((f): f is string => typeof f === "string"))
  if (Array.isArray(result.entries)) {
    for (const e of result.entries) {
      if (typeof e === "string") candidates.push(e)
      else if (e && typeof e === "object" && "path" in e && typeof e.path === "string") {
        candidates.push(e.path)
      }
    }
  }

  const unique = Array.from(new Set(candidates))
  for (let i = 0; i < unique.length; i++) {
    const raw = unique[i]!
    const name = raw.split(/[\\/]/).pop() || raw
    pages.push({
      id: `subpage_${i}_${name}`,
      title: raw.startsWith("http") ? `Visited ${raw}` : `Read ${name}`,
      path: raw.startsWith("http") ? undefined : raw
    })
  }

  return pages
}

function mapToolStatus(state: ThreadToolCall["state"]): AgentStepNode["status"] {
  if (state === "output-error" || state === "output-denied") return "error"
  if (state === "input-streaming" || state === "input-available" || state === "approval-requested") return "running"
  return "completed"
}

export function parseAgentStepNodes(
  reasoning: string = "",
  tools: ThreadToolCall[] = []
): AgentStepNode[] {
  const nodes: AgentStepNode[] = []

  // 1. 思考过程作为树的首个节点（支持在树上独立折叠/展开）
  if (reasoning.trim()) {
    nodes.push({
      id: "step_reasoning_main",
      kind: "thinking",
      title: "Reasoning process",
      status: "completed",
      rawText: reasoning.trim()
    })
  }

  // 2. 将 tools 依次解析为步骤节点
  for (const tool of tools) {
    const kind = toolKind(tool.name)
    const args = asRecord(tool.args)
    const result = asRecord(tool.result)
    const status = mapToolStatus(tool.state)
    const allText = `${JSON.stringify(args)} ${JSON.stringify(result)} ${tool.name}`
    const domains = extractDomains(allText)

    // 提取完整命令与输出
    const fullCommand = typeof args.command === "string" ? args.command : typeof args.cmd === "string" ? args.cmd : undefined
    const output = typeof result.output === "string" ? result.output : typeof result.stdout === "string" ? result.stdout : typeof result.stderr === "string" ? result.stderr : undefined
    const exitCode = typeof result.exitCode === "number" ? result.exitCode : undefined
    const errorText = tool.errorText || (typeof result.error === "string" ? result.error : undefined)

    if (kind === "search" || tool.name.toLowerCase().includes("search")) {
      const query = String(args.query || args.pattern || summarizeToolArgs(tool) || "context")
      const displayTitle = query.length > 50 ? `Searching ${query.slice(0, 50)}...` : `Searching ${query}`
      nodes.push({
        id: tool.id,
        kind: "search",
        title: displayTitle,
        command: fullCommand,
        output,
        exitCode,
        errorText,
        domainPills: domains.length > 0 ? domains : undefined,
        status
      })
    } else if (kind === "coding" || tool.name.includes("read") || tool.name.includes("fetch") || tool.name.includes("list")) {
      const verb = tool.name.toLowerCase()
      const isRead = verb.includes("read") || verb.includes("list") || verb.includes("fetch") || verb.includes("browse")
      const exploredPages = extractFilePaths(args, result)
      const additions = typeof result.additions === "number" ? result.additions : undefined
      const deletions = typeof result.deletions === "number" ? result.deletions : undefined

      if (isRead) {
        const path = String(args.path || args.file || args.url || "")
        const leafName = path.split(/[\\/]/).pop() || path
        nodes.push({
          id: tool.id,
          kind: "reading",
          title: path ? `Reading ${leafName}` : "Reading resources",
          command: fullCommand,
          output,
          exitCode,
          errorText,
          exploredTitle: exploredPages.length > 1 ? `Explored ${exploredPages.length} pages` : undefined,
          exploredPages: exploredPages.length > 0 ? exploredPages : undefined,
          domainPills: domains.length > 0 ? domains : undefined,
          status
        })
      } else {
        const path = String(args.path || args.file || "")
        nodes.push({
          id: tool.id,
          kind: "editing",
          title: `${formatToolName(tool.name)} ${path}`.trim(),
          detail: summarizeToolArgs(tool),
          command: fullCommand,
          output,
          exitCode,
          errorText,
          additions,
          deletions,
          status
        })
      }
    } else {
      // 终端/命令/其它工具（自动从命令中提取域名，如 curl wttr.in）
      const cmd = fullCommand || summarizeToolArgs(tool) || ""
      nodes.push({
        id: tool.id,
        kind: "command",
        title: formatToolName(tool.name),
        detail: cmd ? (cmd.length > 80 ? `${cmd.slice(0, 80)}...` : cmd) : undefined,
        command: cmd,
        output,
        exitCode,
        errorText,
        domainPills: domains.length > 0 ? domains : undefined,
        status
      })
    }
  }

  return nodes
}
