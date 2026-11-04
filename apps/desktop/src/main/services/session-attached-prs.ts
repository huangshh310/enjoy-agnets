/**
 * 会话挂 PR · SQLite 旁表 session_attached_prs（Must#3 / tip C）。
 * 禁 prefs / 禁仅内存 / 禁 JSON 列。
 */
import { randomUUID } from "node:crypto"
import type { AttachedPrItem, SessionAttachedPrs } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"

type Row = {
  number: number
  url: string
  title: string
  isPrimary: number
}

export function getSessionAttachedPrs(sessionId: string): SessionAttachedPrs {
  const rows = getDatabase()
    .prepare(
      `SELECT number as number, url as url, title as title, is_primary as isPrimary
       FROM session_attached_prs
       WHERE session_id = ?
       ORDER BY is_primary DESC, updated_at DESC`
    )
    .all(sessionId) as Row[]
  const items: AttachedPrItem[] = rows.map((row) => ({
    number: row.number,
    url: row.url,
    title: row.title ?? ""
  }))
  const primaryRow = rows.find((row) => row.isPrimary === 1)
  return {
    primary: primaryRow?.number ?? items[0]?.number ?? null,
    items
  }
}

export function setSessionAttachedPrs(sessionId: string, attached: SessionAttachedPrs): SessionAttachedPrs {
  const db = getDatabase()
  const now = Date.now()
  const items = dedupeItems(attached.items)
  let primary = attached.primary
  if (primary != null && !items.some((item) => item.number === primary)) {
    primary = items[0]?.number ?? null
  }
  if (primary == null && items.length > 0) primary = items[0]!.number

  db.exec("BEGIN")
  try {
    db.prepare("DELETE FROM session_attached_prs WHERE session_id = ?").run(sessionId)
    const insert = db.prepare(
      `INSERT INTO session_attached_prs
        (id, session_id, number, url, title, is_primary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const item of items) {
      insert.run(
        randomUUID(),
        sessionId,
        item.number,
        item.url,
        item.title || "",
        item.number === primary ? 1 : 0,
        now,
        now
      )
    }
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
  return { primary, items }
}

/** attach-only：写入/更新一条联动，可选设主挂。禁 create 副作用。 */
export function attachPrToSession(
  sessionId: string,
  item: AttachedPrItem,
  makePrimary = true
): SessionAttachedPrs {
  const cur = getSessionAttachedPrs(sessionId)
  const without = cur.items.filter((row) => row.number !== item.number)
  const items = [{ ...item, title: item.title || "" }, ...without]
  const primary = makePrimary ? item.number : cur.primary ?? item.number
  return setSessionAttachedPrs(sessionId, { primary, items })
}

export function setPrimaryAttachedPr(sessionId: string, number: number): SessionAttachedPrs {
  const cur = getSessionAttachedPrs(sessionId)
  if (!cur.items.some((item) => item.number === number)) return cur
  return setSessionAttachedPrs(sessionId, { primary: number, items: cur.items })
}

function dedupeItems(items: AttachedPrItem[]): AttachedPrItem[] {
  const seen = new Set<number>()
  const out: AttachedPrItem[] = []
  for (const item of items) {
    if (!item || typeof item.number !== "number" || item.number <= 0) continue
    if (seen.has(item.number)) continue
    seen.add(item.number)
    out.push({
      number: item.number,
      url: String(item.url || ""),
      title: String(item.title || "")
    })
  }
  return out
}
