/**
 * 首字前失败：事务里删本轮用户句和空助手，会话 title / updated_at / workflow 复原。
 * 只走 getDatabase() 相对导入，测试才能一跳加载（禁止再 value-import @enjoy-agents/db）。
 */
import { getDatabase } from "./database"

export type SessionTurnSnapshot = {
  title: string
  updatedAt: number
  workflowStatus: string | null
}

export function snapshotSessionTurn(sessionId: string): SessionTurnSnapshot | undefined {
  const row = getDatabase()
    .prepare(
      `SELECT title, updated_at as updatedAt, workflow_status as workflowStatus
       FROM sessions WHERE id = ?`
    )
    .get(sessionId) as
    | { title: string; updatedAt: number; workflowStatus: string | null }
    | undefined
  return row
}

export function rollbackPreOutputMessages(input: {
  sessionId: string
  messageIds: readonly (string | undefined)[]
  snapshot?: SessionTurnSnapshot
}): void {
  const ids = [...new Set(input.messageIds.filter((id): id is string => Boolean(id)))]
  const db = getDatabase()
  db.exec("BEGIN IMMEDIATE;")
  try {
    for (const id of ids) {
      db.prepare("DELETE FROM message_parts WHERE message_id = ?").run(id)
      db.prepare("DELETE FROM messages WHERE id = ? AND session_id = ?").run(id, input.sessionId)
    }
    if (input.snapshot) {
      db.prepare(
        "UPDATE sessions SET title = ?, updated_at = ?, workflow_status = ? WHERE id = ?"
      ).run(
        input.snapshot.title,
        input.snapshot.updatedAt,
        input.snapshot.workflowStatus,
        input.sessionId
      )
    }
    db.exec("COMMIT;")
  } catch (error) {
    db.exec("ROLLBACK;")
    throw error
  }
}

export function markRunDiscardedPreOutput(runId: string, error: string): void {
  getDatabase()
    .prepare(
      "UPDATE runs SET status = ?, error = ?, discarded_pre_output = 1, updated_at = ? WHERE id = ?"
    )
    .run("failed", error, Date.now(), runId)
}

export function countSessionMessages(sessionId: string): number {
  const row = getDatabase()
    .prepare("SELECT COUNT(*) as n FROM messages WHERE session_id = ?")
    .get(sessionId) as { n: number }
  return Number(row.n)
}
