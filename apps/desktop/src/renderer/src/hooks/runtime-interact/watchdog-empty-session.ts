/**
 * jojo P3：看门狗判失败后，这次 Enter 新建出来的空会话不能留在侧栏。
 * 只删真空的：Enter 时还没有会话、现在有；没有在跑的 run / 待回的助手（#145 S1 keepRunning 规则）；
 * 前台没有任何带内容的消息。main 侧 onlyIfEmpty 再兜一次（有落库消息 / 在跑的 run 不删）。
 */
import { messageHasBody } from "./composer-can-send"

type Msg = { role: string; content: string; streaming?: boolean; assets?: readonly unknown[] }

export function emptySessionToDiscardAfterWatchdog(
  beforeSessionId: string | null,
  state: { sessionId: string | null; runId?: string | null; messages: readonly Msg[] },
  /** running 被别的轮占着（排队首发在等它落下，#145 S1 keepRunning）：会话里还有活，不删。 */
  otherTurnHoldsRunning = false
): string | null {
  if (otherTurnHoldsRunning) return null
  if (beforeSessionId || !state.sessionId) return null
  if (state.runId) return null
  if (state.messages.some((m) => m.role === "assistant" && m.streaming)) return null
  // 只图轮也算有内容（leo soft）：不能把刚发了图的会话当空会话删掉。
  if (state.messages.some((m) => (m.role === "user" || m.role === "assistant") && messageHasBody(m))) return null
  return state.sessionId
}
