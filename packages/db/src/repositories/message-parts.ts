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

/** 同一条助手消息 checkpoint 时先清旧 parts，再插入新快照。 */
export function deleteMessageParts(db: AppDatabase, messageId: string): void {
  db.prepare("DELETE FROM message_parts WHERE message_id = ?").run(messageId)
}

export function listMessageParts(db: AppDatabase, messageId: string): MessagePartRow[] {
  return db
    .prepare(
      `SELECT id, message_id as messageId, idx, type, payload, created_at as createdAt
       FROM message_parts WHERE message_id = ? ORDER BY idx ASC`
    )
    .all(messageId) as MessagePartRow[]
}

/**
 * 一次取出某个会话的全部 parts。
 * 按消息逐条查会在切换时长会话时打满主进程；消息顺序由调用方的 messages 查询决定，这里只保证同一条消息内 idx 升序。
 */
export function listMessagePartsForSession(db: AppDatabase, sessionId: string): MessagePartRow[] {
  return db
    .prepare(
      `SELECT p.id as id, p.message_id as messageId, p.idx as idx, p.type as type,
              p.payload as payload, p.created_at as createdAt
       FROM message_parts p
       INNER JOIN messages m ON m.id = p.message_id
       WHERE m.session_id = ?
       ORDER BY p.message_id ASC, p.idx ASC`
    )
    .all(sessionId) as MessagePartRow[]
}

/** 把会话级 parts 按 messageId 归组，组内保持查询给出的 idx 顺序。 */
export function groupMessageParts(rows: readonly MessagePartRow[]): Map<string, MessagePartRow[]> {
  const grouped = new Map<string, MessagePartRow[]>()
  for (const row of rows) {
    const list = grouped.get(row.messageId)
    if (list) list.push(row)
    else grouped.set(row.messageId, [row])
  }
  return grouped
}
