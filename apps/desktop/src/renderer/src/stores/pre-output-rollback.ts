/**
 * 出字前失败：丢掉乐观用户句 + 空助手，草稿回 Composer。
 */
import { isPreOutputFailureCode } from "@enjoy-agents/ipc-contract/pre-output-failure"
import type { ThreadMessage } from "./chat-store"

/** 出字 = 文本 / 思考 / 工具开跑 / 审批 / 引用。 */
export function assistantHasOutput(message: ThreadMessage | undefined): boolean {
  if (!message || message.role !== "assistant") return false
  if (message.content.trim()) return true
  if ((message.reasoning ?? "").trim()) return true
  if (message.tools?.length) return true
  if (message.sources?.length) return true
  return false
}

export function rollbackPreOutputTurn(messages: ThreadMessage[]): {
  messages: ThreadMessage[]
  composer?: string
} {
  let next = messages
  const last = next.at(-1)
  if (last?.role === "assistant" && !assistantHasOutput(last)) {
    next = next.slice(0, -1)
  }
  const user = next.at(-1)
  if (user?.role === "user") {
    return { messages: next.slice(0, -1), composer: user.content }
  }
  return { messages: next }
}

export function shouldRollbackPreOutput(
  event: { preOutput?: boolean; code?: string | null },
  messages: ThreadMessage[]
): boolean {
  if (event.preOutput === true) return true
  if (event.preOutput === false) return false
  if (!isPreOutputFailureCode(event.code ?? undefined)) return false
  const last = messages.at(-1)
  if (last?.role === "assistant") return !assistantHasOutput(last)
  return last?.role === "user"
}
