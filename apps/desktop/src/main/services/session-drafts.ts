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
export function clearSentDraftInTx(db: Db, sessionId: string, sentContent: string, draftText?: string): void {
  ensureTable(db)
  const row = db.prepare("SELECT text FROM session_drafts WHERE session_id = ?").get(sessionId) as
    | { text: string }
    | undefined
  // draftText：renderer 交来的输入框原文（发出的 content 可能垫了前缀），同样只认完全相同。
  if (row && (draftWasSent(row.text, sentContent) || (draftText !== undefined && draftWasSent(row.text, draftText)))) {
    db.prepare("DELETE FROM session_drafts WHERE session_id = ?").run(sessionId)
  }
}

/**
 * jojo P1：草稿附件也落库（只粘了图、没打字的新会话不是空壳）。按会话键，绝不挂到别的会话。
 * 只存元数据（id / name / mediaType / size），图本体在资产库。
 */
export type DraftAsset = {
  id: string
  name: string
  mediaType?: string
  size?: number
  /** leo #155：这张图已随排队项走（不回输入框）；发出后由落库事务清，用户删排队项时 renderer 清。 */
  queued?: { itemId: string; text: string }
}

const QUEUED_TEXT_MAX = 20_000

function cleanQueued(raw: unknown): DraftAsset["queued"] {
  if (!raw || typeof raw !== "object") return undefined
  const rec = raw as Record<string, unknown>
  if (typeof rec.itemId !== "string" || !rec.itemId || rec.itemId.length > 80) return undefined
  return { itemId: rec.itemId, text: typeof rec.text === "string" ? rec.text.slice(0, QUEUED_TEXT_MAX) : "" }
}

function ensureAssetTable(db: Db): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS session_draft_assets (session_id TEXT PRIMARY KEY, assets_json TEXT NOT NULL, updated_at INTEGER NOT NULL)"
  )
}

export function saveSessionDraftAssets(sessionId: string, assets: DraftAsset[]): void {
  if (!sessionId) return
  const db = getDatabase()
  ensureAssetTable(db)
  const clean = assets
    .filter((a) => a && typeof a.id === "string" && a.id)
    .map((a) => {
      const queued = cleanQueued(a.queued)
      return { id: a.id, name: String(a.name ?? ""), mediaType: a.mediaType, size: a.size, ...(queued ? { queued } : {}) }
    })
  if (clean.length > 0) {
    db.prepare(
      "INSERT INTO session_draft_assets (session_id, assets_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET assets_json = excluded.assets_json, updated_at = excluded.updated_at"
    ).run(sessionId, JSON.stringify(clean), Date.now())
  } else {
    db.prepare("DELETE FROM session_draft_assets WHERE session_id = ?").run(sessionId)
  }
}

export function loadSessionDraftAssets(): Record<string, DraftAsset[]> {
  try {
    const db = getDatabase()
    ensureAssetTable(db)
    const rows = db.prepare("SELECT session_id as sessionId, assets_json as json FROM session_draft_assets").all() as Array<{
      sessionId: string
      json: string
    }>
    const out: Record<string, DraftAsset[]> = {}
    for (const row of rows) {
      try {
        const list = JSON.parse(row.json) as DraftAsset[]
        if (Array.isArray(list) && list.length > 0) out[row.sessionId] = list
      } catch {
        // 坏行跳过
      }
    }
    return out
  } catch {
    return {}
  }
}

/**
 * 发送带附件的用户轮时（同一事务）从本会话草稿附件里去掉**这次发出的那几个** asset——
 * 与 clearSentDraftInTx 一致：只清确实发出去的。重新生成 / 编辑重发旧图消息时，草稿里别的图不受影响。
 */
export function clearDraftAssetsInTx(db: Db, sessionId: string, sentAssetIds: string[]): void {
  if (sentAssetIds.length === 0) return
  ensureAssetTable(db)
  const row = db.prepare("SELECT assets_json as json FROM session_draft_assets WHERE session_id = ?").get(sessionId) as
    | { json: string }
    | undefined
  if (!row) return
  let list: DraftAsset[] = []
  try {
    const parsed = JSON.parse(row.json) as unknown
    if (Array.isArray(parsed)) list = parsed as DraftAsset[]
  } catch {
    list = []
  }
  const sent = new Set(sentAssetIds)
  const rest = list.filter((a) => a && typeof a.id === "string" && !sent.has(a.id))
  if (rest.length === list.length && list.length > 0) return
  if (rest.length === 0) {
    db.prepare("DELETE FROM session_draft_assets WHERE session_id = ?").run(sessionId)
  } else {
    db.prepare("UPDATE session_draft_assets SET assets_json = ?, updated_at = ? WHERE session_id = ?").run(
      JSON.stringify(rest),
      Date.now(),
      sessionId
    )
  }
}
