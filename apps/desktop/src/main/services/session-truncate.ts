/**
 * 从指定消息起截断会话：删消息与 parts，清压缩快照。
 */
import { deleteMessageParts } from "@enjoy-agents/db"
import { getDatabase } from "./database"
import { clearConversationSessionAllow } from "./conversation-session-allow"
import { clearInspectPromptSnapshot } from "./inspect-prompt-snapshot"
import { clearSessionCompaction } from "./session-compaction-store"

export async function truncateSessionFrom(
  sessionId: string,
  messageId: string
): Promise<{ deleted: number }> {
  const db = getDatabase()
  const rows = db
    .prepare(
      "SELECT id FROM messages WHERE session_id = ? ORDER BY created_at ASC, id ASC"
    )
    .all(sessionId) as Array<{ id: string }>
  const index = rows.findIndex((row) => row.id === messageId)
  if (index < 0) throw new Error("TRUNCATE_MESSAGE_NOT_FOUND")
  const ids = rows.slice(index).map((row) => row.id)
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
