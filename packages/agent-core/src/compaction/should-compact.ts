/**
 * 接近上下文窗口或消息过多时自动压缩。太短的会话忽略。
 */
import { DEFAULT_KEEP_RECENT } from "./session-compactor.ts"

export const AUTO_COMPACT_WINDOW_RATIO = 0.7
export const AUTO_COMPACT_MESSAGE_FLOOR = 16

export function shouldAutoCompact(input: {
  messageCount: number
  estimatedTokens: number
  contextWindow?: number
  keepRecent?: number
}): boolean {
  const keepRecent = input.keepRecent ?? DEFAULT_KEEP_RECENT
  if (input.messageCount <= keepRecent + 2) return false
  const byCount = input.messageCount >= AUTO_COMPACT_MESSAGE_FLOOR
  const window = input.contextWindow
  const byWindow =
    typeof window === "number" &&
    window > 0 &&
    input.estimatedTokens >= window * AUTO_COMPACT_WINDOW_RATIO
  return byCount || byWindow
}
