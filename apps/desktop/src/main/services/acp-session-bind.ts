/**
 * Enjoy 会话与 ACP sessionId 的绑定。切引擎必须清空。
 */
import { getDatabase } from "./database"

export type AcpSessionBind = {
  runtimeId: string
  acpSessionId: string
}

export function readAcpSessionBind(sessionId: string): AcpSessionBind | undefined {
  const row = getDatabase()
    .prepare(
      "SELECT acp_runtime_id as runtimeId, acp_session_id as acpSessionId FROM sessions WHERE id = ?"
    )
    .get(sessionId) as { runtimeId: string | null; acpSessionId: string | null } | undefined
  const runtimeId = row?.runtimeId?.trim()
  const acpSessionId = row?.acpSessionId?.trim()
  if (!runtimeId || !acpSessionId) return undefined
  return { runtimeId, acpSessionId }
}

export function writeAcpSessionBind(
  sessionId: string,
  runtimeId: string,
  acpSessionId: string
): void {
  getDatabase()
    .prepare("UPDATE sessions SET acp_runtime_id = ?, acp_session_id = ? WHERE id = ?")
    .run(runtimeId, acpSessionId, sessionId)
}

/**
 * 记下会话是从本机助手导入的（引擎 id）。和 ACP 绑定分开存：切引擎清绑定，这个不清。
 * 有这个标记的会话即使在 Enjoy 里没有消息，离开时 / 启动时也不当空壳删。
 */
export function writeSessionImportedFrom(sessionId: string, runtimeId: string): void {
  getDatabase().prepare("UPDATE sessions SET imported_from = ? WHERE id = ?").run(runtimeId, sessionId)
}

export function clearAcpSessionBind(sessionId: string): void {
  getDatabase()
    .prepare("UPDATE sessions SET acp_runtime_id = NULL, acp_session_id = NULL WHERE id = ?")
    .run(sessionId)
}

export function listBoundAcpSessionIds(workspaceId: string, runtimeId: string): Set<string> {
  const rows = getDatabase()
    .prepare(
      `SELECT acp_session_id as acpSessionId FROM sessions
       WHERE workspace_id = ? AND acp_runtime_id = ? AND acp_session_id IS NOT NULL AND archived_at IS NULL`
    )
    .all(workspaceId, runtimeId) as Array<{ acpSessionId: string | null }>
  return new Set(rows.map((row) => row.acpSessionId?.trim()).filter(Boolean) as string[])
}
