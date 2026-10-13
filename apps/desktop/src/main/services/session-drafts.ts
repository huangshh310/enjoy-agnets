/**
 * jojo P1/P2：未发草稿落 DB（不靠 renderer localStorage——SIGKILL 下不可靠）。
 * - 渲染端防抖后写这里；每次写都是一条已提交的 SQLite 语句，强杀不丢。
 * - 用户消息落库时在**同一事务**里清掉这个会话里已发出的那份稿（persistMessage 调 clearSentDraftInTx），
 *   不会出现「消息已落库、重启后草稿又冒出来」导致重复发送。
 */
import { getDatabase } from "./database"

type Db = ReturnType<typeof getDatabase>

const ensured = new WeakSet<object>()

function ensureTable(db: Db): void {
  if (ensured.has(db as object)) return
  db.exec(
    "CREATE TABLE IF NOT EXISTS session_drafts (session_id TEXT PRIMARY KEY, text TEXT NOT NULL, updated_at INTEGER NOT NULL)"
  )
  ensured.add(db as object)
}

export function loadSessionDrafts(): Record<string, string> {
  try {
    const db = getDatabase()
    ensureTable(db)
    const rows = db.prepare("SELECT session_id as sessionId, text FROM session_drafts").all() as Array<{
      sessionId: string
      text: string
    }>
    return Object.fromEntries(rows.filter((row) => row.text.trim()).map((row) => [row.sessionId, row.text]))
  } catch {
    return {}
  }
}

export function saveSessionDraft(sessionId: string, text: string): void {
  if (!sessionId) return
  const db = getDatabase()
  ensureTable(db)
  if (text.trim()) {
    db.prepare(
      "INSERT INTO session_drafts (session_id, text, updated_at) VALUES (?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at"
    ).run(sessionId, text, Date.now())
  } else {
    db.prepare("DELETE FROM session_drafts WHERE session_id = ?").run(sessionId)
  }
}

/** leo：只有正文完全相同才算「这份稿已发出」；短稿不能被以它结尾的长消息误删。 */
export function draftWasSent(draft: string, sentContent: string): boolean {
  const d = draft.trim()
  return Boolean(d) && sentContent.trim() === d
}

/** 在 persistMessage 的事务里调用：用户消息落库的同一步清掉已发出的稿。 */
export function clearSentDraftInTx(db: Db, sessionId: string, sentContent: string): void {
  ensureTable(db)
  const row = db.prepare("SELECT text FROM session_drafts WHERE session_id = ?").get(sessionId) as
    | { text: string }
    | undefined
  if (row && draftWasSent(row.text, sentContent)) {
    db.prepare("DELETE FROM session_drafts WHERE session_id = ?").run(sessionId)
  }
}
