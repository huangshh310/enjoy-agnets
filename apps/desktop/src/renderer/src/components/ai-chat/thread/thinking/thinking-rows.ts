/**
 * 按本轮实际输出拼 Thinking 时间线：思考段落 + 搜索/编码/其它工具，不是手动 Tab。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { asRecord } from "@renderer/lib/record"
import { formatToolName, summarizeToolArgs, toolKind } from "../tool-summary"
import type { TranslateFn } from "@renderer/i18n"

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

export function buildTraceRows(reasoning: string, tools: ThreadToolCall[], t: TranslateFn): TraceRow[] {
  return [...reasoningRows(reasoning), ...tools.map((tool) => toolRow(tool, t))]
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
  seconds: number | null,
  t: TranslateFn
): string {
  const searchOnly =
    tools.length > 0 && tools.every((tool) => toolKind(tool.name) === "search")
  if (streaming) {
    if (searchOnly) return t("chat.searching")
    if (tools.length > 0) return t("chat.runningTools")
    return t("chat.thinking")
  }
  if (tools.length > 0) return t("chat.ranTools", { count: tools.length })
  if (seconds) return t("chat.thoughtSeconds", { seconds })
  return t("chat.thoughtFew")
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

function toolRow(tool: ThreadToolCall, t: TranslateFn): TraceRow {
  const kind = toolKind(tool.name)
  const result = asRecord(tool.result)
  const add = typeof result.additions === "number" ? result.additions : undefined
  const del = typeof result.deletions === "number" ? result.deletions : undefined
  return {
    id: tool.id,
    kind: kind === "other" ? "step" : kind,
    primary: codingVerb(tool.name, t) ?? formatToolName(tool.name),
    secondary: summarizeToolArgs(tool) || undefined,
    mono: kind === "coding",
    add,
    del,
    done: tool.state === "output-available",
    working: tool.state === "input-streaming" || tool.state === "input-available",
    failed: tool.state === "output-error" || tool.state === "output-denied"
  }
}

function codingVerb(name: string, t: TranslateFn): string | undefined {
  if (name === "read_file" || name === "read") return t("chat.verbRead")
  if (name === "write_file" || name === "write") return t("chat.verbWrite")
  if (name === "edit_file" || name === "edit") return t("chat.verbEdit")
  if (name === "bash") return t("chat.verbRun")
  if (
    name === "git_diff" ||
    name === "git_status" ||
    name === "git_log" ||
    name === "git_commit" ||
    name === "git_push"
  ) {
    return t("chat.verbGit")
  }
  return undefined
}
