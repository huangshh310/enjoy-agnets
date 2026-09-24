/**
 * 从某一轮助手回复分叉：只保留截止该轮的可见正文。
 * 不带工具帧、不恢复 ACP 会话。
 */
import { stripEnjoyActionsBlock } from "./action-chip.ts"
import { parseAssistantPayload } from "./assistant-payload.ts"
import { splitQuotedDisplay } from "./quoted-context.ts"

export type ForkSourceMessage = {
  id: string
  role: string
  content: string
}

export type ForkTurn = {
  role: "user" | "assistant"
  content: string
}

export type ForkSelection =
  | { ok: true; turns: ForkTurn[] }
  | { ok: false; code: "FORK_MESSAGE_NOT_FOUND" | "FORK_NOT_ASSISTANT" | "FORK_EMPTY" }

const HOST_MODE = /\[Enjoy host mode:\s*\w+\][\s\S]*?\[\/Enjoy host mode\]\s*/
const SESSION_CONTEXT = /\[Enjoy session context\][\s\S]*?\[\/Enjoy session context\]\s*/

/** 每条消息的可见正文。心跳开跑和分叉共用，不带工具帧。 */
export function visibleSessionTurns(messages: ForkSourceMessage[]): ForkTurn[] {
  const turns: ForkTurn[] = []
  for (const row of messages) {
    const role = forkRole(row.role)
    if (!role) continue
    const content = role === "assistant" ? visibleForkAssistant(row.content) : visibleForkUser(row.content)
    if (content) turns.push({ role, content })
  }
  return turns
}

/** 截止 messageId 那条助手回复（含）的可见用户/助手正文。空轮失败。 */
export function selectForkTurns(messages: ForkSourceMessage[], messageId: string): ForkSelection {
  const end = messages.findIndex((row) => row.id === messageId)
  if (end < 0) return { ok: false, code: "FORK_MESSAGE_NOT_FOUND" }
  const target = messages[end]
  if (!target || target.role !== "assistant") return { ok: false, code: "FORK_NOT_ASSISTANT" }
  const turns = visibleSessionTurns(messages.slice(0, end + 1))
  const last = turns.at(-1)
  if (!last || last.role !== "assistant") return { ok: false, code: "FORK_EMPTY" }
  return { ok: true, turns }
}

function forkRole(role: string): ForkTurn["role"] | null {
  if (role === "assistant" || role === "user") return role
  return null
}

function visibleForkUser(content: string): string {
  return splitQuotedDisplay(content)
    .text.replace(new RegExp(HOST_MODE.source, "g"), "")
    .replace(new RegExp(SESSION_CONTEXT.source, "g"), "")
    .trim()
}

function visibleForkAssistant(content: string): string {
  return stripEnjoyActionsBlock(parseAssistantPayload(content).content).trim()
}
