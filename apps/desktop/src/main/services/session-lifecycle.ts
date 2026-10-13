/**
 * 会话归档 / 恢复 / 永久删除。只动 SQLite，不删工作区磁盘文件。
 */
import { isSessionRunStarting } from "./session-run-starting"
import { clearConversationDesktopAllow } from "@enjoy-agents/agent-core"
import { clearConversationSessionAllow } from "./conversation-session-allow"
import { syncActiveRunsDesktopAllow } from "./conversation-desktop-allow-sync"
import { getDatabase } from "./database"
import type { BrowserWindow } from "electron"
import { stampSessionArchived, stampSessionUnarchived } from "./session-archive-stamp"
import { abortLiveRunsForSession, denyPendingApprovalsForSession } from "./archive-deny-pending"
import { countPendingApprovalsForSession } from "./settle-run-approvals"

export function listArchivedSessions() {
  return getDatabase()
    .prepare(
      `SELECT s.id, s.workspace_id as workspaceId, COALESCE(w.name, '已移除的项目') as workspaceName,
              s.title, s.updated_at as updatedAt, s.archived_at as archivedAt
       FROM sessions s
       LEFT JOIN workspaces w ON w.id = s.workspace_id
       WHERE s.archived_at IS NOT NULL
       ORDER BY s.archived_at DESC`
    )
    .all()
}

export async function archiveSession(sessionId: string, window?: BrowserWindow) {
  const pendingBefore = countPendingApprovalsForSession(sessionId)
  await abortLiveRunsForSession(sessionId)
  await denyPendingApprovalsForSession(sessionId, window)
  const deniedApprovals = pendingBefore
  const now = Date.now()
  const changes = stampSessionArchived(getDatabase(), sessionId, now)
  if (changes === 0) throw new Error("Unknown or already archived session.")
  forgetConversationDesktopAllow(sessionId)
  return { id: sessionId, archivedAt: now, deniedApprovals }
}

export function unarchiveSession(sessionId: string) {
  const changes = stampSessionUnarchived(getDatabase(), sessionId)
  if (changes === 0) throw new Error("Unknown or not archived session.")
  return { id: sessionId }
}

/** 永久删除会话及其消息，并收掉该会话的 ACP 子进程。 */
export function deleteSession(sessionId: string, opts?: { onlyIfEmpty?: boolean }) {
  const db = getDatabase()
  const exists = db.prepare("SELECT id FROM sessions WHERE id = ?").get(sessionId)
  if (!exists) throw new Error("Unknown session.")
  if (opts?.onlyIfEmpty) {
    const count = db
      .prepare("SELECT COUNT(*) as n FROM messages WHERE session_id = ?")
      .get(sessionId) as { n: number }
    if (count.n > 0) return { id: sessionId, deleted: false }
    // jojo P3 / #145 S1：有在跑的 run 也不算空，绝不删。
    const active = db
      .prepare("SELECT COUNT(*) as n FROM runs WHERE session_id = ? AND status IN ('running', 'pending', 'queued')")
      .get(sessionId) as { n: number }
    if (active.n > 0) return { id: sessionId, deleted: false }
    // luna P3：还留着没发的草稿也不算空（离开会话时清空会话不能吞稿）。
    if (sessionHasDraft(db, sessionId)) return { id: sessionId, deleted: false }
    // leo BLOCK ④：心跳 / 标记 / 目标都算「有内容」；run 正在启动落库也不删。
    if (sessionHasKeepers(db, sessionId)) return { id: sessionId, deleted: false }
    if (isSessionRunStarting(sessionId)) return { id: sessionId, deleted: false }
  }
  void import("@enjoy-agents/agent-harness")
    .then(({ deleteAcpRemoteIfLive, disposeAcpSession }) => {
      void deleteAcpRemoteIfLive(sessionId).finally(() => void disposeAcpSession(sessionId))
    })
    .catch(() => undefined)
  db.exec("BEGIN")
  try {
    db.prepare(
      "DELETE FROM message_parts WHERE message_id IN (SELECT id FROM messages WHERE session_id = ?)"
    ).run(sessionId)
    db.prepare("DELETE FROM messages WHERE session_id = ?").run(sessionId)
    for (const sql of SESSION_KEYED_DELETES) deleteIfTable(db, sql, sessionId)
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
  forgetConversationDesktopAllow(sessionId)
  return { id: sessionId, deleted: true }
}

function sessionHasDraft(db: ReturnType<typeof getDatabase>, sessionId: string): boolean {
  try {
    const row = db.prepare("SELECT text FROM session_drafts WHERE session_id = ?").get(sessionId) as
      | { text: string }
      | undefined
    return Boolean(row?.text?.trim())
  } catch (error) {
    // leo BLOCK ④：只有「表还没建」才算没草稿；其它错误一律当有稿，宁可不删。
    if (isNoSuchTable(error)) return false
    return true
  }
}

function isNoSuchTable(error: unknown): boolean {
  return /no such table/i.test(error instanceof Error ? error.message : String(error))
}

/** 删会话时一并清的会话键表（表可能还没建：只吞 no such table）。 */
export const SESSION_KEYED_DELETES = [
  "DELETE FROM run_start_git_heads WHERE run_id IN (SELECT id FROM runs WHERE session_id = ?)",
  "DELETE FROM run_start_dirty WHERE session_id = ?",
  "DELETE FROM session_heartbeats WHERE session_id = ?",
  "DELETE FROM session_drafts WHERE session_id = ?",
  "DELETE FROM session_error_dismissed WHERE session_id = ?"
] as const

function deleteIfTable(db: ReturnType<typeof getDatabase>, sql: string, sessionId: string): void {
  try {
    db.prepare(sql).run(sessionId)
  } catch (error) {
    if (!isNoSuchTable(error)) throw error
  }
}

/** 心跳（哪怕从没跑过）、flagged、设了目标：都不是空壳。查不了一律当有（fail-closed）。 */
function sessionHasKeepers(db: ReturnType<typeof getDatabase>, sessionId: string): boolean {
  try {
    const row = db.prepare("SELECT flagged, goal FROM sessions WHERE id = ?").get(sessionId) as
      | { flagged?: number | null; goal?: string | null }
      | undefined
    if (row && (Number(row.flagged) === 1 || Boolean(row.goal?.trim()))) return true
  } catch {
    return true
  }
  try {
    return Boolean(db.prepare("SELECT 1 FROM session_heartbeats WHERE session_id = ?").get(sessionId))
  } catch (error) {
    return !isNoSuchTable(error)
  }
}

/**
 * luna P3：启动时清掉空的「新对话」行——没有消息、没有任何 run、没有草稿、没归档。
 * 点「新对话」或首发失败后留下的空壳不该一直挂在侧栏。
 */
export function pruneEmptySessions(): { deleted: number } {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT s.id FROM sessions s
       WHERE s.archived_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.session_id = s.id)
         AND NOT EXISTS (SELECT 1 FROM runs r WHERE r.session_id = s.id)
         AND COALESCE(s.flagged, 0) = 0
         AND (s.goal IS NULL OR TRIM(s.goal) = '')`
    )
    .all() as Array<{ id: string }>
  let deleted = 0
  for (const row of rows) {
    if (sessionHasDraft(db, row.id) || sessionHasKeepers(db, row.id)) continue
    try {
      if (deleteSession(row.id, { onlyIfEmpty: true }).deleted) deleted += 1
    } catch {
      // 并发删掉了：跳过
    }
  }
  return { deleted }
}

function forgetConversationDesktopAllow(sessionId: string): void {
  clearConversationDesktopAllow(sessionId)
  clearConversationSessionAllow(sessionId)
  syncActiveRunsDesktopAllow(sessionId)
}

export function deleteAllArchivedSessions() {
  const rows = getDatabase()
    .prepare("SELECT id FROM sessions WHERE archived_at IS NOT NULL")
    .all() as Array<{ id: string }>
  for (const row of rows) deleteSession(row.id)
  return { deleted: rows.length }
}
