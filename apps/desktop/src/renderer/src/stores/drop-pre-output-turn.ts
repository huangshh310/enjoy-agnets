/**
 * 首字前失败：拿掉本轮乐观用户句和空助手。
 */
import { isEmptyStreamingAssistant } from "../hooks/composer-run-policy"
import type { ThreadMessage } from "./chat-store"

/** keepUser：库里保留了已有用户句（重新生成 / 编辑重发），界面只撤空助手。 */
export function dropPreOutputOptimisticTurn(
  messages: ThreadMessage[],
  opts: { keepUser?: boolean } = {}
): ThreadMessage[] {
  let next = messages
  if (isEmptyStreamingAssistant(next.at(-1))) next = next.slice(0, -1)
  if (!opts.keepUser && next.at(-1)?.role === "user") next = next.slice(0, -1)
  return next
}

export function lastUserText(messages: ThreadMessage[]): string {
  const last = [...messages].reverse().find((item) => item.role === "user")
  return last?.content ?? ""
}
