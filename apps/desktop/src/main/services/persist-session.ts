/**
 * 会话落库：消息写入（checkpoint 同 id 覆盖）、首轮自动改名、流式文本/思考累积。
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
import { deleteMessageParts, insertMessageParts } from "@enjoy-agents/db"
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
    return
  }
  foldToolEvent(tools, event)
  if (event.type === "tool.start") {
    stampToolReasoningChars(tools, event.toolCallId, transcript.think.length)
  }
}

function stampToolReasoningChars(tools: ThreadToolCall[], toolCallId: string, reasoningChars: number) {
  const tool = tools.find((item) => item.id === toolCallId)
  if (tool && tool.reasoningChars == null) tool.reasoningChars = reasoningChars
}

/**
 * 写入或覆盖一条消息。checkpoint 传已有 messageId，只更新 content/parts，不改 created_at。
 * @returns 落库后的消息 id，供同一轮后续 UPDATE。
 */
export function persistMessage(
  sessionId: string,
  role: string,
  content: string,
  parts?: UIMessagePart[],
  messageId?: string
): string {
  const now = Date.now()
  const db = getDatabase()
  const id = messageId ?? createId("msg")
  if (messageId && messageExists(id)) {
    db.prepare("UPDATE messages SET content = ? WHERE id = ?").run(content, id)
    deleteMessageParts(db, id)
  } else {
    db.prepare(
      "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, sessionId, role, content, now)
  }
  const stored = parts && parts.length > 0 ? parts : migrateContentToParts(content)
  insertMessageParts(
    db,
    stored.map((part, idx) => ({
      id: createId("prt"),
      messageId: id,
      idx,
      type: part.type,
      payload: JSON.stringify(part),
      createdAt: now
    }))
  )
  db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, sessionId)
  return id
}

function messageExists(id: string): boolean {
  return Boolean(getDatabase().prepare("SELECT 1 FROM messages WHERE id = ?").get(id))
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
