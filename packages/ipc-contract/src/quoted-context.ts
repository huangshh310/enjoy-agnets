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

/** 引用块：> [引用自步骤: title] + 逐行引用。协议头给模型看，不跟界面语言走。 */
export function formatQuotedContext(quote: QuotedContext): string {
  const snippet = quotedBody(quote).slice(0, QUOTE_SNIPPET_MAX)
  const body = snippet
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")
  return `> [引用自步骤: ${quote.title}]\n${body}`
}

export function formatQuotedContexts(quotes: readonly QuotedContext[]): string {
  return quotes.filter((quote) => quotedBody(quote)).map(formatQuotedContext).join("\n\n")
}

export function composeQuotedPrompt(quotes: readonly QuotedContext[], draft: string): string {
  const block = formatQuotedContexts(quotes)
  return [block, draft.trim()].filter(Boolean).join("\n\n")
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
