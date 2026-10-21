/**
 * 「从这里重来」前收掉没人能再拍板的 waiting_review：
 * 回挂已扫完（restore settled）、内存里又没有这条 ActiveRun 的 agent 行，批准 / 拒绝只会报「no longer active」。
 * 按停止的口径结清：未决写 cancelled，run 写 cancelled。workflow 父行没有 ActiveRun，不碰；回挂没扫完也不碰。
 */
import { updateRun } from "@enjoy-agents/db"
import { getActiveRun } from "./agent-run-state.ts"
import { getDatabase } from "./database.ts"
import { isRestoreWaitingSettled } from "./restore-once.ts"
import { settlePendingApprovalsForRun } from "./settle-run-approvals.ts"

export function settleOrphanWaitingRuns(sessionId: string): number {
  if (!isRestoreWaitingSettled()) return 0
  const db = getDatabase()
  const rows = db
    .prepare("SELECT id FROM runs WHERE session_id = ? AND kind = 'agent' AND status = 'waiting_review'")
    .all(sessionId) as Array<{ id: string }>
  let settled = 0
  for (const row of rows) {
    if (getActiveRun(row.id)) continue
    settlePendingApprovalsForRun(row.id)
    updateRun(db, row.id, { status: "cancelled", checkpoint: null })
    settled += 1
  }
  return settled
}
