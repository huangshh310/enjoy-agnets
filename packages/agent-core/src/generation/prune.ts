/**
 * 长会话裁剪：先本地截断条数，再走 SDK pruneMessages 清 reasoning / 空消息。
 */
import { pruneMessages, type ModelMessage } from "ai"

const DEFAULT_MAX = 40

export function clipHistory<T extends { role: string }>(messages: T[], max = DEFAULT_MAX): T[] {
  if (messages.length <= max) return messages
  const system = messages.filter((message) => message.role === "system")
  const rest = messages.filter((message) => message.role !== "system")
  const keep = Math.max(1, max - system.length)
  return [...system, ...rest.slice(-keep)]
}

export function pruneModelMessages(messages: ModelMessage[]): ModelMessage[] {
  return pruneMessages({
    messages: clipHistory(messages),
    reasoning: "before-last-message",
    emptyMessages: "remove"
  })
}
