/**
 * 识别「继续未完成 Todo」用户句。前缀必须与 ipc-contract `todo-continue.ts` 对齐。
 */
import { isTodoContinueUserMessage } from "@enjoy-agents/ipc-contract/todo-continue"
/** 与 main 同一套（ipc-contract）：只认完整内部提示，先剥 ACP 宿主模式围栏。 */
export { isTodoContinueUserMessage }

/** 丢掉末尾的续跑用户句和空助手轮，保留带 Todo 的上一轮助手。 */
export function dropTrailingContinueTurns<T extends { role?: string; content?: string; tools?: unknown[] }>(
  messages: T[]
): T[] {
  let end = messages.length
  while (end > 0) {
    const last = messages[end - 1]
    if (!last) break
    if (last.role === "user" && isTodoContinueUserMessage(last.content)) {
      end -= 1
      continue
    }
    if (last.role === "assistant" && isEmptyAssistantTurn(last)) {
      end -= 1
      continue
    }
    break
  }
  return messages.slice(0, end)
}

export function isEmptyAssistantTurn(message: { content?: string; tools?: unknown[] }): boolean {
  const hasText = Boolean(message.content?.trim())
  const hasTools = Array.isArray(message.tools) && message.tools.length > 0
  return !hasText && !hasTools
}

/**
 * luna（#147 后续）：重试 / 重新生成哪一轮走「续跑 Todo」的合成提示，哪一轮重发用户原话。
 * 只有这一轮的用户句本身就是续跑句才续跑；失败 / 空的助手轮前面是用户真话 → 重发原话，
 * 否则内部英文续跑提示会被当成本轮输入（模型 / stub 回显进聊天）。
 */
export function shouldRetryAsTodoContinue(userMessage: { content?: string } | undefined): boolean {
  return isTodoContinueUserMessage(userMessage?.content)
}
