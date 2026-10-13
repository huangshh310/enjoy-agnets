/**
 * jojo P1 / leo：会话「当前」的失败红卡。
 * 只看最近一条 agent run（回挂 / 补跑超时这类恢复码不算一轮）；它不是 failed 就没卡——
 * 「失败 → 成功 → 重启」不会翻出旧卡。用户关掉的卡按 runId 落水位，重启不再还原；归档会话不出卡。
 */
import { listRuns } from "@enjoy-agents/db"
import { isRestoreFamilyCode } from "@enjoy-agents/ipc-contract/restore-codes"
import { CATCH_UP_APPROVAL_TIMEOUT } from "@enjoy-agents/ipc-contract/automations-missed"
import { getDatabase } from "./database"

export type SessionLastError = {
  runId: string
  message: string
  updatedAt: number
}

export const SESSION_ERROR_MESSAGE_MAX = 300

type Db = ReturnType<typeof getDatabase>

function ensureDismissTable(db: Db): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS session_error_dismissed (session_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, updated_at INTEGER NOT NULL)"
  )
}

/** 红卡对外文案：去栈、去路径、去 token，截断。 */
export function redactRunError(raw: string): string {
  let s = raw.split(/\n\s+at\s/)[0] ?? ""
  s = s.replace(/\b(sk|pk|ghp|gho|ghs|xox[abp]|AKIA)[-_A-Za-z0-9]{8,}/g, "[redacted]")
  s = s.replace(/\b(Bearer|token[=:]?)\s*[A-Za-z0-9._\-+/=]{12,}/gi, "$1 [redacted]")
  s = s.replace(/\b[A-Fa-f0-9]{32,}\b/g, "[redacted]")
  s = s.replace(/\b[A-Za-z0-9+/_-]{40,}={0,2}/g, "[redacted]")
  s = s.replace(/(?:[A-Za-z]:\\|~\/|\/)(?:[^\s/\\:'"`]+[/\\])+[^\s'"`:,)]*/g, "[path]")
  s = s.replace(/\s+/g, " ").trim()
  if (s.length > SESSION_ERROR_MESSAGE_MAX) s = `${s.slice(0, SESSION_ERROR_MESSAGE_MAX - 1)}…`
  return s
}

/** 关卡落水位：未给 runId 时取当前会出卡的那条。 */
export function dismissSessionError(sessionId: string, runId?: string): void {
  if (!sessionId) return
  const target = runId || sessionLastError(sessionId)?.runId
  if (!target) return
  const db = getDatabase()
  ensureDismissTable(db)
  db.prepare(
    "INSERT INTO session_error_dismissed (session_id, run_id, updated_at) VALUES (?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET run_id = excluded.run_id, updated_at = excluded.updated_at"
  ).run(sessionId, target, Date.now())
}

export function sessionLastError(sessionId: string): SessionLastError | null {
  if (!sessionId) return null
  try {
    const db = getDatabase()
    const ses = db.prepare("SELECT archived_at FROM sessions WHERE id = ?").get(sessionId) as
      | { archived_at: number | null }
      | undefined
    if (!ses || ses.archived_at != null) return null
    const runs = listRuns(db, { sessionId, kind: "agent" })
    const latest = runs.find((run) => {
      const err = typeof run.error === "string" ? run.error.trim() : ""
      return !(err && (isRestoreFamilyCode(err) || err === CATCH_UP_APPROVAL_TIMEOUT))
    })
    if (!latest || latest.status !== "failed") return null
    const message = redactRunError(typeof latest.error === "string" ? latest.error : "")
    if (!message) return null
    ensureDismissTable(db)
    const dismissed = db
      .prepare("SELECT run_id FROM session_error_dismissed WHERE session_id = ?")
      .get(sessionId) as { run_id: string } | undefined
    if (dismissed?.run_id === latest.id) return null
    return { runId: latest.id, message, updatedAt: latest.updatedAt }
  } catch {
    return null
  }
}
