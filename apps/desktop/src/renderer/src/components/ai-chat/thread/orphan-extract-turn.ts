/**
 * Extract 旁路 run 曾误开空助手轮，和原卡片重复。只藏这种孤儿，不删用户正文。
 */

export type ThreadLike = {
  role: string
  content: string
  assets?: unknown[]
  tools?: unknown[]
  structured?: unknown
  components?: Array<{ componentId: string }>
}

export function isOrphanExtractTurn(message: ThreadLike, previous?: ThreadLike) {
  if (message.role !== "assistant") return false
  if (message.content.trim() || message.assets?.length || message.tools?.length) return false
  if (!hasExtractCard(message)) return false
  return Boolean(previous && previous.role === "assistant" && hasExtractCard(previous))
}

export function visibleThreadMessages<T extends ThreadLike>(messages: T[]): T[] {
  return messages.filter((message, index) => !isOrphanExtractTurn(message, messages[index - 1]))
}

function hasExtractCard(message: ThreadLike) {
  return (
    message.structured != null ||
    Boolean(message.components?.some((item) => item.componentId === "card"))
  )
}
