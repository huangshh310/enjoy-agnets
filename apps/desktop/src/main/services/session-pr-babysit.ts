/**
 * P2 切片② · 盯 PR SQLite SoT（session_pr_babysit v22）。
 * 禁 prefs / 禁仅内存。
 */
import { randomUUID } from "node:crypto"
import type { PrBabysitWakeKind, PrBabysitWatchItem } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"

type Row = {
  sessionId: string
  workspaceId: string
  number: number
  url: string
  startedAt: number
  lastPolledAt: number | null
  lastWakeKind: string | null
}

function mapRow(row: Row): PrBabysitWatchItem {
  return {
    sessionId: row.sessionId,
    workspaceId: row.workspaceId,
    number: row.number,
    url: row.url ?? "",
    startedAt: row.startedAt,
    lastPolledAt: row.lastPolledAt ?? null,
    lastWakeKind: (row.lastWakeKind as PrBabysitWakeKind | null) ?? null
  }
}

export function listSessionPrBabysit(sessionId?: string): PrBabysitWatchItem[] {
  const db = getDatabase()
  if (sessionId) {
    const rows = db
      .prepare(
        `SELECT session_id as sessionId, workspace_id as workspaceId, number as number,
                url as url, started_at as startedAt, last_polled_at as lastPolledAt,
                last_wake_kind as lastWakeKind
         FROM session_pr_babysit
         WHERE session_id = ?
         ORDER BY started_at DESC`
      )
      .all(sessionId) as Row[]
    return rows.map(mapRow)
  }
  const rows = db
    .prepare(
      `SELECT session_id as sessionId, workspace_id as workspaceId, number as number,
              url as url, started_at as startedAt, last_polled_at as lastPolledAt,
              last_wake_kind as lastWakeKind
       FROM session_pr_babysit
       ORDER BY started_at DESC`
    )
    .all() as Row[]
  return rows.map(mapRow)
}

export function getSessionPrBabysit(sessionId: string, number: number): PrBabysitWatchItem | null {
  const row = getDatabase()
    .prepare(
      `SELECT session_id as sessionId, workspace_id as workspaceId, number as number,
              url as url, started_at as startedAt, last_polled_at as lastPolledAt,
              last_wake_kind as lastWakeKind
       FROM session_pr_babysit
       WHERE session_id = ? AND number = ?`
    )
    .get(sessionId, number) as Row | undefined
  return row ? mapRow(row) : null
}

export function upsertSessionPrBabysit(input: {
  sessionId: string
  workspaceId: string
  number: number
  url?: string
}): PrBabysitWatchItem {
  const db = getDatabase()
  const now = Date.now()
  const existing = getSessionPrBabysit(input.sessionId, input.number)
  if (existing) {
    db.prepare(
      `UPDATE session_pr_babysit
       SET workspace_id = ?, url = ?, started_at = ?
       WHERE session_id = ? AND number = ?`
    ).run(input.workspaceId, input.url || existing.url || "", now, input.sessionId, input.number)
    return getSessionPrBabysit(input.sessionId, input.number)!
  }
  db.prepare(
    `INSERT INTO session_pr_babysit
      (id, session_id, workspace_id, number, url, started_at, last_polled_at, last_checks_state, last_comment_count, last_mergeable, last_wake_kind)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL)`
  ).run(randomUUID(), input.sessionId, input.workspaceId, input.number, input.url || "", now)
  return getSessionPrBabysit(input.sessionId, input.number)!
}

export function removeSessionPrBabysit(sessionId: string, number: number): void {
  getDatabase()
    .prepare(`DELETE FROM session_pr_babysit WHERE session_id = ? AND number = ?`)
    .run(sessionId, number)
}

export function updateSessionPrBabysitPoll(
  sessionId: string,
  number: number,
  patch: {
    lastPolledAt: number
    lastChecksState?: string | null
    lastCommentCount?: number | null
    lastMergeable?: string | null
    lastWakeKind?: PrBabysitWakeKind | null
  }
): void {
  getDatabase()
    .prepare(
      `UPDATE session_pr_babysit
       SET last_polled_at = ?,
           last_checks_state = COALESCE(?, last_checks_state),
           last_comment_count = COALESCE(?, last_comment_count),
           last_mergeable = COALESCE(?, last_mergeable),
           last_wake_kind = COALESCE(?, last_wake_kind)
       WHERE session_id = ? AND number = ?`
    )
    .run(
      patch.lastPolledAt,
      patch.lastChecksState ?? null,
      patch.lastCommentCount ?? null,
      patch.lastMergeable ?? null,
      patch.lastWakeKind ?? null,
      sessionId,
      number
    )
}

export function readBabysitPollCursor(sessionId: string, number: number): {
  lastChecksState: string | null
  lastCommentCount: number | null
  lastMergeable: string | null
} {
  const row = getDatabase()
    .prepare(
      `SELECT last_checks_state as lastChecksState,
              last_comment_count as lastCommentCount,
              last_mergeable as lastMergeable
       FROM session_pr_babysit
       WHERE session_id = ? AND number = ?`
    )
    .get(sessionId, number) as
    | { lastChecksState: string | null; lastCommentCount: number | null; lastMergeable: string | null }
    | undefined
  return {
    lastChecksState: row?.lastChecksState ?? null,
    lastCommentCount: row?.lastCommentCount ?? null,
    lastMergeable: row?.lastMergeable ?? null
  }
}
