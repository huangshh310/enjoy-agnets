/**
 * 一会话一条心跳。停用是删行，不是第二套自动化列表。
 */
import type { SessionHeartbeat, SessionHeartbeatPutInput } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { createId } from "./ids"
import { compileCadence, defaultTimeZone } from "./automations-cron"

type HeartbeatRow = {
  id: string
  sessionId: string
  cronExpr: string
  timeZone: string
  prompt: string
  maxRuns: number | null
  runCount: number
  enabled: number
  lastRunAt: number | null
}

const HEARTBEAT_SELECT = `SELECT id, session_id as sessionId, cron_expr as cronExpr, time_zone as timeZone,
              prompt, max_runs as maxRuns, run_count as runCount, enabled, last_run_at as lastRunAt
       FROM session_heartbeats`

export function readHeartbeat(sessionId: string): SessionHeartbeat | null {
  const row = getDatabase()
    .prepare(`${HEARTBEAT_SELECT} WHERE session_id = ?`)
    .get(sessionId) as HeartbeatRow | undefined
  return row ? toHeartbeat(row) : null
}

export function listEnabledHeartbeats(): SessionHeartbeat[] {
  const rows = getDatabase()
    .prepare(`${HEARTBEAT_SELECT} WHERE enabled = 1`)
    .all() as HeartbeatRow[]
  return rows.map(toHeartbeat)
}

/** 非法 cron 拒绝。同一会话再保存会替换旧的一条。 */
export function putHeartbeat(input: SessionHeartbeatPutInput): SessionHeartbeat {
  const cronExpr = compileCadence(input.cronExpr)
  if (!cronExpr) throw new Error("HEARTBEAT_CRON_INVALID")
  const now = Date.now()
  const existing = readHeartbeat(input.sessionId)
  const id = existing?.id ?? createId("hb")
  const timeZone = input.timeZone?.trim() || existing?.timeZone || defaultTimeZone()
  const maxRuns = input.maxRuns === undefined ? (existing?.maxRuns ?? null) : input.maxRuns
  getDatabase()
    .prepare(
      `INSERT INTO session_heartbeats
        (id, session_id, cron_expr, time_zone, prompt, max_runs, run_count, enabled, last_run_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, NULL, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET
         cron_expr = excluded.cron_expr,
         time_zone = excluded.time_zone,
         prompt = excluded.prompt,
         max_runs = excluded.max_runs,
         run_count = 0,
         enabled = 1,
         last_run_at = NULL,
         updated_at = excluded.updated_at`
    )
    .run(id, input.sessionId, cronExpr, timeZone, input.prompt.trim(), maxRuns, now, now)
  const saved = readHeartbeat(input.sessionId)
  if (!saved) throw new Error("HEARTBEAT_SAVE_FAILED")
  return saved
}

export function clearHeartbeat(sessionId: string): { ok: true } {
  getDatabase().prepare("DELETE FROM session_heartbeats WHERE session_id = ?").run(sessionId)
  return { ok: true }
}

export function stampHeartbeat(id: string, at: number, nextRunCount?: number): void {
  if (nextRunCount == null) {
    getDatabase()
      .prepare("UPDATE session_heartbeats SET last_run_at = ?, updated_at = ? WHERE id = ?")
      .run(at, at, id)
    return
  }
  getDatabase()
    .prepare("UPDATE session_heartbeats SET last_run_at = ?, run_count = ?, updated_at = ? WHERE id = ?")
    .run(at, nextRunCount, at, id)
}

export function disableHeartbeat(id: string): void {
  getDatabase()
    .prepare("UPDATE session_heartbeats SET enabled = 0, updated_at = ? WHERE id = ?")
    .run(Date.now(), id)
}

function toHeartbeat(row: HeartbeatRow): SessionHeartbeat {
  return {
    id: row.id,
    sessionId: row.sessionId,
    cronExpr: row.cronExpr,
    timeZone: row.timeZone,
    prompt: row.prompt,
    maxRuns: row.maxRuns,
    runCount: row.runCount,
    enabled: row.enabled === 1,
    lastRunAt: row.lastRunAt
  }
}
