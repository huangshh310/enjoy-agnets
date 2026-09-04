/**
 * 识别「继续未完成 Todo」用户句。前缀必须与 ipc-contract `todo-continue.ts` 对齐。
 */
const TODO_CONTINUE_MARKERS = [
  "继续完成未完成的内容。Continue the in_progress Todo List item with write_file / edit_file; do not stop at a written plan.",
  "The Todo List still has unfinished items.",
  "Continue the unfinished Todo List",
  "继续完成 Todo List",
  "继续完成未完成的内容",
  "继续完成剩余任务"
]

export function isTodoContinueUserMessage(content: string | undefined): boolean {
  const text = content?.trim() ?? ""
  if (!text) return false
  return TODO_CONTINUE_MARKERS.some((marker) => text.startsWith(marker) || text === marker)
}

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
