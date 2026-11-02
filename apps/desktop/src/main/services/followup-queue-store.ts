/**
 * t3-b：会话级 followup 账本持久（停跑/重启不丢）。
 * 与 session.drafts 同族：renderer 改队列写穿 main；启动 sync list 回灌。
 * 暂停 reason 一并落盘，防重启后误自启。
 */
import { getDatabase } from "./database"

type Db = ReturnType<typeof getDatabase>

const ensured = new WeakSet<object>()

export type PersistedFollowupAsset = {
  id: string
  name: string
  mediaType?: string
  size?: number
}

export type PersistedFollowupItem = {
  id: string
  sessionId: string
  prompt: string
  text: string
  draft?: string
  quotedContexts?: unknown[]
  skillChips?: unknown[]
  assets: PersistedFollowupAsset[]
  createdAt: number
  status: "pending" | "elevated_to_steer"
}

export type FollowupPausedReason =
  | "stopped"
  | "engineSwitched"
  | "held"
  | "error"
  | "quota"
  | "midTurn"

export type FollowupQueueSnapshot = {
  items: PersistedFollowupItem[]
  paused: Record<string, FollowupPausedReason>
}

const PAUSED_REASONS = new Set<FollowupPausedReason>([
  "stopped",
  "engineSwitched",
  "held",
  "error",
  "quota",
  "midTurn"
])

const ITEM_ID_MAX = 80
const SESSION_ID_MAX = 120
const TEXT_MAX = 200_000
const ASSETS_MAX = 32

function ensureTable(db: Db): void {
  if (ensured.has(db as object)) return
  db.exec(
    "CREATE TABLE IF NOT EXISTS followup_queue (id INTEGER PRIMARY KEY CHECK (id = 1), items_json TEXT NOT NULL, paused_json TEXT NOT NULL, updated_at INTEGER NOT NULL)"
  )
  ensured.add(db as object)
}

function cleanAsset(raw: unknown): PersistedFollowupAsset | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  if (typeof rec.id !== "string" || !rec.id || rec.id.length > 80) return null
  return {
    id: rec.id,
    name: typeof rec.name === "string" ? rec.name.slice(0, 260) : rec.id,
    mediaType: typeof rec.mediaType === "string" ? rec.mediaType.slice(0, 120) : undefined,
    size: typeof rec.size === "number" && Number.isFinite(rec.size) ? rec.size : undefined
  }
}

function cleanItem(raw: unknown): PersistedFollowupItem | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  if (typeof rec.id !== "string" || !rec.id || rec.id.length > ITEM_ID_MAX) return null
  if (typeof rec.sessionId !== "string" || !rec.sessionId || rec.sessionId.length > SESSION_ID_MAX) return null
  const prompt =
    typeof rec.prompt === "string"
      ? rec.prompt.slice(0, TEXT_MAX)
      : typeof rec.text === "string"
        ? rec.text.slice(0, TEXT_MAX)
        : ""
  const text = typeof rec.text === "string" ? rec.text.slice(0, TEXT_MAX) : prompt
  const assetsRaw = Array.isArray(rec.assets) ? rec.assets : []
  const assets: PersistedFollowupAsset[] = []
  for (const row of assetsRaw.slice(0, ASSETS_MAX)) {
    const asset = cleanAsset(row)
    if (asset) assets.push(asset)
  }
  const status = rec.status === "elevated_to_steer" ? "elevated_to_steer" : "pending"
  const createdAt = typeof rec.createdAt === "number" && Number.isFinite(rec.createdAt) ? rec.createdAt : Date.now()
  const draft = typeof rec.draft === "string" ? rec.draft.slice(0, TEXT_MAX) : undefined
  return {
    id: rec.id,
    sessionId: rec.sessionId,
    prompt,
    text,
    draft,
    quotedContexts: Array.isArray(rec.quotedContexts) ? rec.quotedContexts.slice(0, 32) : undefined,
    skillChips: Array.isArray(rec.skillChips) ? rec.skillChips.slice(0, 32) : undefined,
    assets,
    createdAt,
    status
  }
}

function cleanPaused(raw: unknown): Record<string, FollowupPausedReason> {
  if (!raw || typeof raw !== "object") return {}
  const out: Record<string, FollowupPausedReason> = {}
  for (const [sessionId, reason] of Object.entries(raw as Record<string, unknown>)) {
    if (!sessionId || sessionId.length > SESSION_ID_MAX) continue
    if (typeof reason !== "string" || !PAUSED_REASONS.has(reason as FollowupPausedReason)) continue
    out[sessionId] = reason as FollowupPausedReason
  }
  return out
}

export function loadFollowupQueue(): FollowupQueueSnapshot {
  try {
    const db = getDatabase()
    ensureTable(db)
    const row = db.prepare("SELECT items_json as itemsJson, paused_json as pausedJson FROM followup_queue WHERE id = 1").get() as
      | { itemsJson: string; pausedJson: string }
      | undefined
    if (!row) return { items: [], paused: {} }
    let itemsRaw: unknown = []
    let pausedRaw: unknown = {}
    try {
      itemsRaw = JSON.parse(row.itemsJson) as unknown
    } catch {
      itemsRaw = []
    }
    try {
      pausedRaw = JSON.parse(row.pausedJson) as unknown
    } catch {
      pausedRaw = {}
    }
    const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map(cleanItem).filter((x): x is PersistedFollowupItem => Boolean(x))
    const paused = cleanPaused(pausedRaw)
    // 队列空了：暂停跟着清（与 renderer 一致）
    for (const sessionId of Object.keys(paused)) {
      if (!items.some((item) => item.sessionId === sessionId)) delete paused[sessionId]
    }
    return { items, paused }
  } catch {
    return { items: [], paused: {} }
  }
}

export function saveFollowupQueue(snapshot: FollowupQueueSnapshot): void {
  const db = getDatabase()
  ensureTable(db)
  const items = (snapshot.items ?? []).map(cleanItem).filter((x): x is PersistedFollowupItem => Boolean(x))
  const paused = cleanPaused(snapshot.paused ?? {})
  for (const sessionId of Object.keys(paused)) {
    if (!items.some((item) => item.sessionId === sessionId)) delete paused[sessionId]
  }
  if (items.length === 0) {
    db.prepare("DELETE FROM followup_queue WHERE id = 1").run()
    return
  }
  db.prepare(
    "INSERT INTO followup_queue (id, items_json, paused_json, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET items_json = excluded.items_json, paused_json = excluded.paused_json, updated_at = excluded.updated_at"
  ).run(JSON.stringify(items), JSON.stringify(paused), Date.now())
}
