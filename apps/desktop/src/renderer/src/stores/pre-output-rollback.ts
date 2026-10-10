/**
 * 出字前失败：丢掉乐观用户句 + 空助手，草稿回 Composer。
 */
import { isPreOutputFailureCode } from "@enjoy-agents/ipc-contract/pre-output-failure"
import type { ThreadMessage } from "./chat-store"

/** 模型真出字 = 文本 / 思考 / 工具。开泵前 cite 的 sources 不算。 */
export function assistantHasOutput(message: ThreadMessage | undefined): boolean {
  if (!message || message.role !== "assistant") return false
  if (message.content.trim()) return true
  if ((message.reasoning ?? "").trim()) return true
  if (message.tools?.length) return true
  return false
}

export function rollbackPreOutputTurn(
  messages: ThreadMessage[],
  opts?: { dropAssistant?: boolean }
): {
  messages: ThreadMessage[]
  composer?: string
} {
  let next = messages
  const last = next.at(-1)
  // preOutput=true：开泵前 cite 的 source.added 不算产出，助手也要撕掉。
  if (last?.role === "assistant" && (opts?.dropAssistant || !assistantHasOutput(last))) {
    next = next.slice(0, -1)
  }
  const user = next.at(-1)
  if (user?.role === "user") {
    return { messages: next.slice(0, -1), composer: user.content }
  }
  return { messages: next }
}

/** 本轮还没出字：空助手或停在用户句。 */
export function lastTurnHasNoOutput(messages: ThreadMessage[]): boolean {
  const last = messages.at(-1)
  if (last?.role === "assistant") return !assistantHasOutput(last)
  return last?.role === "user"
}

export function shouldRollbackPreOutput(
  event: { preOutput?: boolean; code?: string | null },
  messages: ThreadMessage[]
): boolean {
  if (event.preOutput === true) return true
  if (!isPreOutputFailureCode(event.code ?? undefined)) return false
  // Zod `.catch(false)` 把缺省打成 false；闸码且尚未出字仍回滚（ipc 缺省回落）。
  return lastTurnHasNoOutput(messages)
}

/** running 且尚未认领 runId 时，出字前失败不得进缓冲，否则晚到的 run.start 会再补泡。 */
export function isImmediatePreOutputError(event: {
  type: string
  preOutput?: boolean
  code?: string
}): boolean {
  if (event.type !== "run.error") return false
  return event.preOutput === true || isPreOutputFailureCode(event.code)
}
