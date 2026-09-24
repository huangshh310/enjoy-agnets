/**
 * 心跳开跑带上这条会话已有的可见正文，再追加这一拍的 prompt。
 */
import { visibleSessionTurns } from "@enjoy-agents/ipc-contract"
import { listMessages } from "./session-queries"

export async function heartbeatMessages(sessionId: string, prompt: string) {
  const rows = await listMessages(sessionId)
  const prior = visibleSessionTurns(rows)
  return [...prior, { role: "user" as const, content: prompt }]
}
