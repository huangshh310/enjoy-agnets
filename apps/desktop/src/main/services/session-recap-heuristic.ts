/**
 * Recap 启发式：无 Enjoy 模型或 LLM 失败时用。剥围栏后再截用户句。
 */
import { stripTitleSource } from "@enjoy-agents/ipc-contract/session-title"

export function heuristicRecap(messages: Array<{ role: string; content: string }>): string {
  const firstUser = stripTitleSource(messages.find((row) => row.role === "user")?.content ?? "").slice(
    0,
    60
  )
  return `目标：「${firstUser}…」，已推进 ${messages.length} 轮交互。`
}
