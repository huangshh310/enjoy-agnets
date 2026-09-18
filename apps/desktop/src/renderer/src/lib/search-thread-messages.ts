/**
 * ⌘L 搜当前线程消息。满 2 个字符才搜，最近的在前。
 */

export type ThreadMessageHit = {
  id: string
  role: "user" | "assistant"
  preview: string
}

export function searchThreadMessages(
  messages: Array<{ id: string; role: string; content: string }>,
  query: string,
  limit = 8
): ThreadMessageHit[] {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return []
  const hits: ThreadMessageHit[] = []
  for (let index = messages.length - 1; index >= 0 && hits.length < limit; index -= 1) {
    const message = messages[index]
    if (message?.role !== "user" && message?.role !== "assistant") continue
    const text = message.content.replace(/\s+/g, " ").trim()
    if (!text.toLowerCase().includes(needle)) continue
    hits.push({
      id: message.id,
      role: message.role,
      preview: text.slice(0, 96)
    })
  }
  return hits
}

export function revealThreadMessage(messageId: string) {
  document
    .querySelector(`[data-thread-message="${CSS.escape(messageId)}"]`)
    ?.scrollIntoView({ block: "center" })
}
