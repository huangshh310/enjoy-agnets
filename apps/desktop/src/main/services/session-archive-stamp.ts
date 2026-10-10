/**
 * 归档只写 archived_at，不碰 updated_at。
 * 侧栏按 updated_at 排；bump 会让撤销后的会话跳到顶并挤开当前高亮。
 */
import type { AppDatabase } from "@enjoy-agents/db"

export function stampSessionArchived(db: AppDatabase, sessionId: string, archivedAt: number): number {
  return Number(
    db.prepare("UPDATE sessions SET archived_at = ? WHERE id = ? AND archived_at IS NULL").run(
      archivedAt,
      sessionId
    ).changes
  )
}

export function stampSessionUnarchived(db: AppDatabase, sessionId: string): number {
  return Number(
    db
      .prepare("UPDATE sessions SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL")
      .run(sessionId).changes
  )
}

export function sessionUpdatedAt(db: AppDatabase, sessionId: string): number | undefined {
  const row = db.prepare("SELECT updated_at as updatedAt FROM sessions WHERE id = ?").get(sessionId) as
    | { updatedAt?: number }
    | undefined
  return row?.updatedAt
}
