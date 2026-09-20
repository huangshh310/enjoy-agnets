/**
 * 会话目标 / 阶段总结：Enjoy 走 system 句，ACP 折进用户 prompt 围栏（气泡要剥掉）。
 */
import { visibleRecapText } from "@enjoy-agents/ipc-contract/session-recap-kind"

const CONTEXT_OPEN = "[Enjoy session context]"
const CONTEXT_CLOSE = "[/Enjoy session context]"
const CONTEXT_FENCE = /\[Enjoy session context\][\s\S]*?\[\/Enjoy session context\]\s*/

export type SessionContextInput = {
  goal?: string | null
  recap?: string | null
}

export type OutgoingChatMessage = {
  id?: string
  role: string
  content: string
  reasoning?: string
}

export function sessionSystemMessages(input: SessionContextInput): Array<{
  role: "system"
  content: string
}> {
  const out: Array<{ role: "system"; content: string }> = []
  const goal = input.goal?.trim()
  const recap = visibleRecapText(input.recap)
  if (goal) out.push({ role: "system", content: `[Session Goal]: ${goal}` })
  if (recap) out.push({ role: "system", content: `[Session Recap]: ${recap}` })
  return out
}

export function prefixSessionContext(draft: string, input: SessionContextInput): string {
  if (CONTEXT_FENCE.test(draft)) return draft
  const lines: string[] = []
  const goal = input.goal?.trim()
  const recap = visibleRecapText(input.recap)
  if (goal) lines.push(`Goal: ${goal}`)
  if (recap) lines.push(`Recap: ${recap}`)
  if (lines.length === 0) return draft
  const block = `${CONTEXT_OPEN}\n${lines.join("\n")}\n${CONTEXT_CLOSE}`
  return [block, draft.trim()].filter(Boolean).join("\n\n")
}

export function stripSessionContext(content: string): string {
  return content.replace(CONTEXT_FENCE, "").trim()
}

/** Enjoy：system 句。ACP：折进最后一条用户正文，避免 CLI 丢掉 system。 */
export function applySessionContextToOutgoing(
  isAcp: boolean,
  input: SessionContextInput,
  messages: OutgoingChatMessage[]
): OutgoingChatMessage[] {
  const systems = sessionSystemMessages(input).map((row) => ({
    role: row.role,
    content: row.content
  }))
  if (!isAcp) return [...systems, ...messages]
  const index = lastUserIndex(messages)
  if (index < 0) {
    const content = prefixSessionContext("", input)
    return content ? [...messages, { role: "user", content }] : messages
  }
  const next = messages.slice()
  const current = next[index]
  if (!current) return messages
  next[index] = { ...current, content: prefixSessionContext(current.content, input) }
  return next
}

function lastUserIndex(messages: OutgoingChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return i
  }
  return -1
}
