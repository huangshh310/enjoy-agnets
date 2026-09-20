/**
 * ACP 导入列表投影：不碰 SQLite / spawn。
 */
import type { ListAcpSessionsResult } from "@enjoy-agents/ipc-contract"

export function projectListedAcpSessions(input: {
  supported: boolean
  sessions: Array<{ sessionId: string; title?: string; updatedAt?: string; cwd: string }>
  imported: Set<string>
  cwd: string
  error?: string
}): ListAcpSessionsResult {
  if (!input.supported) return { supported: false, sessions: [] }
  const cwd = input.cwd.replace(/\\/g, "/")
  const sessions = input.sessions
    .filter((row) => row.cwd.replace(/\\/g, "/") === cwd)
    .map((row) => ({
      sessionId: row.sessionId,
      title: row.title,
      updatedAt: row.updatedAt,
      imported: input.imported.has(row.sessionId)
    }))
  return input.error
    ? { supported: true, sessions, error: input.error }
    : { supported: true, sessions }
}
