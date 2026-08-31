/**
 * 按本轮实际输出拼 Thinking 时间线：思考段落 + 搜索/编码/其它工具，不是手动 Tab。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { asRecord } from "@renderer/lib/record"
import { formatToolName, summarizeToolArgs, toolKind } from "./tool-summary"

export type TraceRow = {
  id: string
  kind: "reasoning" | "search" | "coding" | "step"
  primary: string
  secondary?: string
  mono?: boolean
  add?: number
  del?: number
  done: boolean
  working: boolean
  failed?: boolean
}

export function buildTraceRows(reasoning: string, tools: ThreadToolCall[]): TraceRow[] {
  return [...reasoningRows(reasoning), ...tools.map(toolRow)]
}

/** 流式或等待审批时默认展开；1fr 折叠在自适应高度下会把内容压成 0。 */
export function isTraceExpanded(
  streaming: boolean,
  tools: ThreadToolCall[],
  manual: boolean | null
): boolean {
  if (manual != null) return manual
  if (streaming) return true
  return tools.some((tool) => tool.state === "approval-requested")
}

export function thinkingHeadline(
  streaming: boolean,
  tools: ThreadToolCall[],
  seconds: number | null
): string {
  const searchOnly =
    tools.length > 0 && tools.every((tool) => toolKind(tool.name) === "search")
  if (streaming) {
    if (searchOnly) return "Searching"
    if (tools.length > 0) return "Running tools"
    return "Thinking"
  }
  if (tools.length > 0) return `Ran ${tools.length} ${tools.length === 1 ? "tool" : "tools"}`
  if (seconds) return `Thought for ${seconds} seconds`
  return "Thought for a few seconds"
}

function reasoningRows(reasoning: string): TraceRow[] {
  const chunks = reasoning
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
  return chunks.map((primary, index) => ({
    id: `reasoning-${index}`,
    kind: "reasoning" as const,
    primary,
    done: true,
    working: false
  }))
}

function toolRow(tool: ThreadToolCall): TraceRow {
  const kind = toolKind(tool.name)
  const result = asRecord(tool.result)
  const add = typeof result.additions === "number" ? result.additions : undefined
  const del = typeof result.deletions === "number" ? result.deletions : undefined
  return {
    id: tool.id,
    kind: kind === "other" ? "step" : kind,
    primary: codingVerb(tool.name) ?? formatToolName(tool.name),
    secondary: summarizeToolArgs(tool) || undefined,
    mono: kind === "coding",
    add,
    del,
    done: tool.state === "output-available",
    working: tool.state === "input-streaming" || tool.state === "input-available",
    failed: tool.state === "output-error" || tool.state === "output-denied"
  }
}

function codingVerb(name: string): string | undefined {
  if (name === "read_file") return "Read"
  if (name === "edit_file" || name === "write_file") return "Edit"
  if (name === "bash") return "Run"
  if (name === "git_diff" || name === "git_status") return "Git"
  return undefined
}
