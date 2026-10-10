/**
 * 从指定消息起截断会话：删消息与 parts，清压缩快照与本会话允许表。
 */
import { deleteMessageParts } from "@enjoy-agents/db"
import { getDatabase } from "./database"
import { clearConversationSessionAllow } from "./conversation-session-allow"
import { clearInspectPromptSnapshot } from "./inspect-prompt-snapshot"
import { clearSessionCompaction } from "./session-compaction-store"

function listSessionMessageIds(sessionId: string): Array<{ id: string }> {
  return getDatabase()
    .prepare("SELECT id FROM messages WHERE session_id = ? ORDER BY created_at ASC, id ASC")
    .all(sessionId) as Array<{ id: string }>
}

export async function truncateSessionFrom(
  sessionId: string,
  messageId: string
): Promise<{ deleted: number }> {
  const rows = listSessionMessageIds(sessionId)
  const index = rows.findIndex((row) => row.id === messageId)
  if (index < 0) throw new Error("TRUNCATE_MESSAGE_NOT_FOUND")
  const ids = rows.slice(index).map((row) => row.id)
  const db = getDatabase()
  const deleteMessage = db.prepare("DELETE FROM messages WHERE id = ?")
  for (const id of ids) {
    deleteMessageParts(db, id)
    deleteMessage.run(id)
  }
  await clearSessionCompaction(sessionId)
  clearInspectPromptSnapshot(sessionId)
  clearConversationSessionAllow(sessionId)
  return { deleted: ids.length }
}

/** 保留 keepMessageId，删掉其后的尾巴。与 truncateFrom 同路清表。 */
export async function truncateSessionAfter(
  sessionId: string,
  keepMessageId: string
): Promise<{ deleted: number }> {
  const rows = listSessionMessageIds(sessionId)
  const index = rows.findIndex((row) => row.id === keepMessageId)
  if (index < 0) throw new Error("TRUNCATE_MESSAGE_NOT_FOUND")
  const firstTail = rows[index + 1]
  if (!firstTail) return { deleted: 0 }
  return truncateSessionFrom(sessionId, firstTail.id)
}

/**
 * regenerate / edit-and-resend：入参最后一条仍在库里的消息之后若有尾巴，截掉。
 * 没有对得上的 id 不动库（普通发送漏 id 仍靠水位继承）。续跑不要走这条。
 */
export async function maybeTruncateSessionToIncomingHistory(
  sessionId: string,
  incoming: ReadonlyArray<{ id?: string }>
): Promise<{ deleted: number }> {
  let rows: Array<{ id: string }>
  try {
    rows = listSessionMessageIds(sessionId)
  } catch {
    return { deleted: 0 }
  }
  if (rows.length === 0) return { deleted: 0 }
  const dbIds = new Set(rows.map((row) => row.id))
  let keep: string | undefined
  for (let i = incoming.length - 1; i >= 0; i -= 1) {
    const id = incoming[i]?.id?.trim()
    if (id && dbIds.has(id)) {
      keep = id
      break
    }
  }
  if (!keep) return { deleted: 0 }
  return truncateSessionAfter(sessionId, keep)
}
