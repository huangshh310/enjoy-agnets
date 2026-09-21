/**
 * 运行时引用与纠偏入参。格式化后拼进用户消息，不另开协议。
 */
import { z } from "zod"

export const TaskStatus = z.enum(["idle", "running", "paused", "waiting_review"])
export type TaskStatus = z.infer<typeof TaskStatus>

export const QuotedContextType = z.enum([
  "file",
  "diff",
  "terminal_output",
  "task_step",
  "tool_call",
  "file_diff",
  "text_selection",
  "thought_step"
])
export type QuotedContextType = z.infer<typeof QuotedContextType>

export const QuotedContext = z.object({
  id: z.string(),
  sourceId: z.string().optional(),
  type: QuotedContextType,
  title: z.string(),
  snippet: z.string().optional(),
  /** 合同字段；没有则回落 snippet。 */
  content: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})
export type QuotedContext = z.infer<typeof QuotedContext>

export const QUOTE_SNIPPET_MAX = 2000

/** 引用正文：优先 content，否则 snippet。 */
export function quotedBody(quote: QuotedContext): string {
  return (quote.content ?? quote.snippet ?? "").trim()
}

export const SteerAgentInput = z.object({
  sessionId: z.string(),
  runId: z.string().optional(),
  text: z.string().min(1)
})
export type SteerAgentInput = z.infer<typeof SteerAgentInput>

/** 引用块：> [引用自文件|终端|步骤: title] + 逐行引用。协议头给模型看，不跟界面语言走。 */
export function formatQuotedContext(quote: QuotedContext): string {
  const snippet = quotedBody(quote).slice(0, QUOTE_SNIPPET_MAX)
  const body = snippet
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")
  return `> [${quoteHeader(quote.type)}: ${quote.title}]\n${body}`
}

function quoteHeader(type: QuotedContextType): string {
  if (type === "file") return "引用自文件"
  if (type === "diff" || type === "file_diff") return "引用自 diff"
  if (type === "terminal_output") return "引用自终端"
  if (type === "text_selection") return "引用自对话"
  return "引用自步骤"
}

export function formatQuotedContexts(quotes: readonly QuotedContext[]): string {
  return quotes.filter((quote) => quotedBody(quote)).map(formatQuotedContext).join("\n\n")
}

export function composeQuotedPrompt(quotes: readonly QuotedContext[], draft: string): string {
  const block = formatQuotedContexts(quotes)
  return [block, draft.trim()].filter(Boolean).join("\n\n")
}

export type QuotedDisplayChip = {
  title: string
  kind: "file" | "diff" | "terminal" | "step"
}

/** 气泡只展示 Chip + 用户正文；引用块仍留在发给模型的 Prompt 里。 */
export function splitQuotedDisplay(content: string): { chips: QuotedDisplayChip[]; text: string } {
  const chips: QuotedDisplayChip[] = []
  let rest = content.replace(/^\uFEFF/, "")
  while (rest.length > 0) {
    const match = rest.match(/^> \[引用自(文件|diff|终端|步骤|对话): (.+)\](?:\n|$)/)
    if (!match) break
    chips.push({ title: match[2]!.trim(), kind: displayKind(match[1]!) })
    rest = rest.slice(match[0].length)
    rest = stripQuotedBody(rest)
  }
  return { chips, text: rest.trim() }
}

/** 编辑重发时保住原引用块，只换用户正文。 */
export function replaceQuotedDraft(content: string, draft: string): string {
  const { text } = splitQuotedDisplay(content)
  const prefix = text ? content.slice(0, content.length - text.length).replace(/\s+$/, "") : content.trim()
  return [prefix, draft.trim()].filter(Boolean).join("\n\n")
}

function displayKind(label: string): QuotedDisplayChip["kind"] {
  if (label === "文件") return "file"
  if (label === "diff") return "diff"
  if (label === "终端") return "terminal"
  return "step"
}

function stripQuotedBody(rest: string): string {
  let next = rest
  while (next.startsWith(">")) {
    const nl = next.indexOf("\n")
    if (nl < 0) return ""
    next = next.slice(nl + 1)
  }
  return next.startsWith("\n") ? next.slice(1) : next
}

export function deriveTaskStatus(input: {
  running: boolean
  pendingApproval: boolean
  paused?: boolean
}): TaskStatus {
  if (input.pendingApproval) return "waiting_review"
  if (input.paused) return "paused"
  if (input.running) return "running"
  return "idle"
}
