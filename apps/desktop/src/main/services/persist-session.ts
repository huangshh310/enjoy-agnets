/**
 * 会话落库：消息写入、首轮自动改名、流式文本/思考累积。
 */
import {
  absorbTextDelta,
  foldToolEvent,
  migrateContentToParts,
  type StreamEvent,
  type ThinkBuffer,
  type ThreadToolCall,
  type UIMessagePart
} from "@enjoy-agents/ipc-contract"
import { insertMessageParts } from "@enjoy-agents/db"
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

export function persistMessage(
  sessionId: string,
  role: string,
  content: string,
  parts?: UIMessagePart[]
) {
  const now = Date.now()
  const messageId = createId("msg")
  getDatabase()
    .prepare(
      "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(messageId, sessionId, role, content, now)
  const stored = parts && parts.length > 0 ? parts : migrateContentToParts(content)
  insertMessageParts(
    getDatabase(),
    stored.map((part, idx) => ({
      id: createId("prt"),
      messageId,
      idx,
      type: part.type,
      payload: JSON.stringify(part),
      createdAt: now
    }))
  )
  getDatabase().prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, sessionId)
}

export function maybeRenameSession(sessionId: string, userText: string) {
  const current = getDatabase()
    .prepare("SELECT title FROM sessions WHERE id = ?")
    .get(sessionId) as { title: string } | undefined
  if (!current || current.title !== "New agent") return
  renameSession(sessionId, userText.replace(/\s+/g, " ").slice(0, 42) || "New agent")
}

/** 标题由 renderer useCompletion 精炼后回写。 */
export function renameSession(sessionId: string, title: string) {
  const next = title.replace(/\s+/g, " ").trim().slice(0, 80)
  if (!next) throw new Error("Session title cannot be empty.")
  getDatabase()
    .prepare("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?")
    .run(next, Date.now(), sessionId)
  return { id: sessionId, title: next }
}
