/**
 * inbox_state 仓储：已读 / 隐藏 / 归档条目。合并语义在服务层做。
 */
import type { AppDatabase } from "../client"

export type InboxStateRecord = {
  id: string
  readAt: number | null
  hiddenAt: number | null
  itemJson: string | null
}

export function getInboxState(db: AppDatabase, id: string): InboxStateRecord | undefined {
  const row = db
    .prepare(
      `SELECT id, read_at as readAt, hidden_at as hiddenAt, item_json as itemJson
       FROM inbox_state WHERE id = ?`
    )
    .get(id) as InboxStateRecord | undefined
  return row
}

export function listInboxStates(db: AppDatabase): InboxStateRecord[] {
  return db
    .prepare(
      `SELECT id, read_at as readAt, hidden_at as hiddenAt, item_json as itemJson
       FROM inbox_state ORDER BY updated_at DESC`
    )
    .all() as InboxStateRecord[]
}

export function upsertInboxState(db: AppDatabase, row: InboxStateRecord): void {
  db.prepare(
    `INSERT INTO inbox_state (id, read_at, hidden_at, item_json, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       read_at = excluded.read_at,
       hidden_at = excluded.hidden_at,
       item_json = excluded.item_json,
       updated_at = excluded.updated_at`
  ).run(row.id, row.readAt, row.hiddenAt, row.itemJson, Date.now())
}

/** 清掉隐藏超过 cutoff 的归档，防表无限长大。 */
export function deleteHiddenInboxStatesBefore(db: AppDatabase, cutoffMs: number): void {
  db.prepare("DELETE FROM inbox_state WHERE hidden_at IS NOT NULL AND hidden_at < ?").run(cutoffMs)
}
