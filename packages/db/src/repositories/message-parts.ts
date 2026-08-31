/**
 * message_parts：版本化 UIMessage 部件，旧 content 仍作兼容字段。
 */
import type { AppDatabase } from "../client"

export type MessagePartRow = {
  id: string
  messageId: string
  idx: number
  type: string
  payload: string
  createdAt: number
}

export function insertMessageParts(db: AppDatabase, rows: MessagePartRow[]): void {
  const stmt = db.prepare(
    `INSERT INTO message_parts (id, message_id, idx, type, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  for (const row of rows) {
    stmt.run(row.id, row.messageId, row.idx, row.type, row.payload, row.createdAt)
  }
}

export function listMessageParts(db: AppDatabase, messageId: string): MessagePartRow[] {
  return db
    .prepare(
      `SELECT id, message_id as messageId, idx, type, payload, created_at as createdAt
       FROM message_parts WHERE message_id = ? ORDER BY idx ASC`
    )
    .all(messageId) as MessagePartRow[]
}
