/**
 * 会话归档 / 恢复 / 永久删除。只动 SQLite，不删工作区磁盘文件。
 */
import { clearConversationDesktopAllow } from "@enjoy-agents/agent-core"
import { syncActiveRunsDesktopAllow } from "./conversation-desktop-allow-sync"
import { getDatabase } from "./database"
import type { BrowserWindow } from "electron"
import { stampSessionArchived, stampSessionUnarchived } from "./session-archive-stamp"
import { denyPendingApprovalsForSession } from "./archive-deny-pending"

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
  const deniedApprovals = await denyPendingApprovalsForSession(sessionId, window)
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
export function deleteSession(sessionId: string) {
  const db = getDatabase()
  const exists = db.prepare("SELECT id FROM sessions WHERE id = ?").get(sessionId)
  if (!exists) throw new Error("Unknown session.")
  void import("@enjoy-agents/agent-harness").then(({ deleteAcpRemoteIfLive, disposeAcpSession }) => {
    void deleteAcpRemoteIfLive(sessionId).finally(() => void disposeAcpSession(sessionId))
  })
  db.exec("BEGIN")
  try {
    db.prepare(
      "DELETE FROM message_parts WHERE message_id IN (SELECT id FROM messages WHERE session_id = ?)"
    ).run(sessionId)
    db.prepare("DELETE FROM messages WHERE session_id = ?").run(sessionId)
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
  forgetConversationDesktopAllow(sessionId)
  return { id: sessionId }
}

function forgetConversationDesktopAllow(sessionId: string): void {
  clearConversationDesktopAllow(sessionId)
  syncActiveRunsDesktopAllow(sessionId)
}

export function deleteAllArchivedSessions() {
  const rows = getDatabase()
    .prepare("SELECT id FROM sessions WHERE archived_at IS NOT NULL")
    .all() as Array<{ id: string }>
  for (const row of rows) deleteSession(row.id)
  return { deleted: rows.length }
}
