/**
 * 首字前失败：拿掉本轮乐观用户句和空助手。
 */
import { isEmptyStreamingAssistant } from "../hooks/composer-run-policy"
import type { ThreadMessage } from "./chat-store"

export function dropPreOutputOptimisticTurn(messages: ThreadMessage[]): ThreadMessage[] {
  let next = messages
  if (isEmptyStreamingAssistant(next.at(-1))) next = next.slice(0, -1)
  if (next.at(-1)?.role === "user") next = next.slice(0, -1)
  return next
}

export function lastUserText(messages: ThreadMessage[]): string {
  const last = [...messages].reverse().find((item) => item.role === "user")
  return last?.content ?? ""
}
