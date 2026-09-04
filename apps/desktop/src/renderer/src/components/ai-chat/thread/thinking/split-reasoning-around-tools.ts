/**
 * 把整段 reasoning 按工具开始时的字数切开，得到「思考 → 工具 → 思考」时间线。
 * 旧消息没有 reasoningChars 时，仍把全部思考放在工具前面。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"

export type ReasoningTimelineItem =
  | { kind: "think"; text: string }
  | { kind: "tool"; tool: ThreadToolCall }

export function splitReasoningAroundTools(
  reasoning: string,
  tools: ThreadToolCall[]
): ReasoningTimelineItem[] {
  const visible = tools.filter((tool) => !isTodoWriteName(tool.name))
  const hasCuts = visible.some((tool) => typeof tool.reasoningChars === "number")
  if (!hasCuts) return legacyTimeline(reasoning, visible)

  const items: ReasoningTimelineItem[] = []
  let cursor = 0
  for (const tool of visible) {
    const cut = tool.reasoningChars ?? cursor
    const slice = reasoning.slice(cursor, Math.max(cursor, cut)).trim()
    if (slice) items.push({ kind: "think", text: slice })
    cursor = Math.max(cursor, cut)
    items.push({ kind: "tool", tool })
  }
  const rest = reasoning.slice(cursor).trim()
  if (rest) items.push({ kind: "think", text: rest })
  return items
}

function legacyTimeline(reasoning: string, tools: ThreadToolCall[]): ReasoningTimelineItem[] {
  const items: ReasoningTimelineItem[] = []
  const text = reasoning.trim()
  if (text) items.push({ kind: "think", text })
  for (const tool of tools) items.push({ kind: "tool", tool })
  return items
}

function isTodoWriteName(name: string): boolean {
  const normalized = name.toLowerCase()
  return normalized === "todo_write" || normalized === "todo" || normalized === "update_todos"
}
