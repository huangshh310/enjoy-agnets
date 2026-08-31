/**
 * 会话落库：消息写入、首轮自动改名、流式文本/思考累积。
 */
import {
  absorbTextDelta,
  foldToolEvent,
  type StreamEvent,
  type ThinkBuffer,
  type ThreadToolCall
} from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { createId } from "./ids"

export type RunTranscript = ThinkBuffer

export function emptyTranscript(): RunTranscript {
  return { visible: "", think: "", pendingThink: false }
}

export function persistFromEvent(
  tools: ThreadToolCall[],
  event: StreamEvent,
  transcript: RunTranscript
) {
  if (event.type === "text.delta") {
    const next = absorbTextDelta(transcript, event.text)
    transcript.visible = next.visible
    transcript.think = next.think
    transcript.pendingThink = next.pendingThink
    return
  }
  if (event.type === "reasoning.delta") {
    transcript.think += event.text
  } else {
    foldToolEvent(tools, event)
  }
}

export function persistMessage(sessionId: string, role: string, content: string) {
  const now = Date.now()
  getDatabase()
    .prepare(
      "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(createId("msg"), sessionId, role, content, now)
  getDatabase().prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, sessionId)
}

export function maybeRenameSession(sessionId: string, userText: string) {
  const current = getDatabase()
    .prepare("SELECT title FROM sessions WHERE id = ?")
    .get(sessionId) as { title: string } | undefined
  if (!current || current.title !== "New agent") return
  const title = userText.replace(/\s+/g, " ").slice(0, 42) || "New agent"
  getDatabase()
    .prepare("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?")
    .run(title, Date.now(), sessionId)
}
