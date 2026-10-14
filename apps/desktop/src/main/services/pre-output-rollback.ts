/**
 * 首字前失败：事务里删本轮新插入的用户句和空助手，会话 title / updated_at / workflow 复原。
 * 只走 getDatabase() 相对导入，测试才能一跳加载（禁止再 value-import @enjoy-agents/db）。
 */
import { getDatabase } from "./database"

export type SessionTurnSnapshot = {
  title: string
  updatedAt: number
  workflowStatus: string | null
  /** 快照时刻。回滚再兜一层：早于它的行不是本轮插入的，永不删。 */
  capturedAt?: number
}

export function snapshotSessionTurn(sessionId: string): SessionTurnSnapshot | undefined {
  const capturedAt = Date.now()
  const row = getDatabase()
    .prepare(
      `SELECT title, updated_at as updatedAt, workflow_status as workflowStatus
       FROM sessions WHERE id = ?`
    )
    .get(sessionId) as
    | { title: string; updatedAt: number; workflowStatus: string | null }
    | undefined
  return row ? { ...row, capturedAt } : undefined
}

export function readSessionTitle(sessionId: string): string | undefined {
  const row = getDatabase().prepare("SELECT title FROM sessions WHERE id = ?").get(sessionId) as
    | { title: string }
    | undefined
  return row?.title
}

/**
 * messageIds 必须只含本轮新插入的行（见 preOutputRollbackIds）。兜底：带快照时只删
 * created_at ≥ 快照时刻的行。parts 也带会话条件，别的会话的 parts 不受牵连。titleAfterStart 给了时，只有库里标题仍是它才复原。
 */
let throwForTest = false
/** 行为测试：让回滚事务抛错，验证泵失败收口仍撤 run（会话不卡 RUN_ACTIVE）。 */
export function setPreOutputRollbackThrowForTest(value: boolean): void {
  throwForTest = value
}

export function rollbackPreOutputMessages(input: {
  sessionId: string
  messageIds: readonly (string | undefined)[]
  snapshot?: SessionTurnSnapshot
  titleAfterStart?: string
}): void {
  const ids = [...new Set(input.messageIds.filter((id): id is string => Boolean(id)))]
  const db = getDatabase()
  const since = input.snapshot?.capturedAt ?? Number.NEGATIVE_INFINITY
  db.exec("BEGIN IMMEDIATE;")
  try {
    if (throwForTest) throw new Error("PRE_OUTPUT_ROLLBACK_TEST_INJECTED")
    for (const id of ids) {
      db.prepare(
        "DELETE FROM message_parts WHERE message_id IN (SELECT id FROM messages WHERE id = ? AND session_id = ? AND created_at >= ?)"
      ).run(id, input.sessionId, since)
      db.prepare("DELETE FROM messages WHERE id = ? AND session_id = ? AND created_at >= ?").run(
        id,
        input.sessionId,
        since
      )
    }
    if (input.snapshot) {
      const current = readSessionTitle(input.sessionId)
      const renamedMeanwhile =
        input.titleAfterStart !== undefined && current !== undefined && current !== input.titleAfterStart
      db.prepare(
        "UPDATE sessions SET title = ?, updated_at = ?, workflow_status = ? WHERE id = ?"
      ).run(
        renamedMeanwhile ? current : input.snapshot.title,
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
