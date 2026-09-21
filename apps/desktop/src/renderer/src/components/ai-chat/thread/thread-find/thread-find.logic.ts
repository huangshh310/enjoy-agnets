/**
 * 本会话查找：匹配列表与循环下标。不走 ⌘L 的 8 条上限。
 */
import { revealThreadMessage } from "../../../../lib/search-thread-messages.ts"

export type ThreadFindDoc = {
  id: string
  role: string
  content: string
}

export type ThreadFindMatch = {
  messageId: string
}

export function normalizeFindQuery(raw: string): string {
  return raw.trim()
}

/** 满 1 个字符才搜；最近的消息在前，同一条消息只记一次。 */
export function collectThreadFindMatches(messages: readonly ThreadFindDoc[], rawQuery: string): ThreadFindMatch[] {
  const query = normalizeFindQuery(rawQuery).toLowerCase()
  if (!query) return []
  const hits: ThreadFindMatch[] = []
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message) continue
    if (message.role !== "user" && message.role !== "assistant") continue
    if (!searchableText(message.content).includes(query)) continue
    hits.push({ messageId: message.id })
  }
  return hits
}

export function stepFindIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return 0
  return (((current + delta) % length) + length) % length
}

export function revealThreadFindMatch(messageId: string): HTMLElement | null {
  revealThreadMessage(messageId)
  const node = document.querySelector(`[data-thread-message="${CSS.escape(messageId)}"]`)
  return node instanceof HTMLElement ? node : null
}

/** 查找用可见正文：丢掉引用协议头，避免搜到「引用自文件」。 */
function searchableText(content: string): string {
  const stripped = content.replace(/^> \[引用自[^\]]+\]\n?(?:> .*\n?)*/gm, "")
  return stripped.replace(/\s+/g, " ").toLowerCase()
}
