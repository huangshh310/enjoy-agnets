/**
 * 本会话允许表水位：授权时记下 id 序列哈希 + 条数。
 * 前缀对不上、条数变少、入参比库短、读不到库：清表。
 */
import { createHash } from "node:crypto"
import { getDatabase } from "./database"

export type SessionAllowWatermark = {
  idHash: string
  messageCount: number
}

export type SessionHistorySnapshot = {
  ids: string[]
}

export type SessionHistoryReader = (sessionId: string) => SessionHistorySnapshot | undefined

const watermarks = new Map<string, SessionAllowWatermark>()

export function hashSessionMessageIds(ids: readonly string[]): string {
  return createHash("sha256").update(ids.join("\0")).digest("hex")
}

function readSessionHistoryFromDb(sessionId: string): SessionHistorySnapshot | undefined {
  try {
    const rows = getDatabase()
      .prepare("SELECT id FROM messages WHERE session_id = ? ORDER BY created_at ASC, id ASC")
      .all(sessionId) as Array<{ id: string }>
    return { ids: rows.map((row) => row.id) }
  } catch {
    return undefined
  }
}

let readHistory: SessionHistoryReader = readSessionHistoryFromDb

export function setSessionHistoryReaderForTest(reader?: SessionHistoryReader): void {
  readHistory = reader ?? readSessionHistoryFromDb
}

function usableSessionId(sessionId: string): string | undefined {
  const sid = sessionId.trim()
  if (!sid || sid.includes("::")) return undefined
  return sid
}

export function peekSessionAllowWatermark(sessionId: string): SessionAllowWatermark | undefined {
  const sid = usableSessionId(sessionId)
  return sid ? watermarks.get(sid) : undefined
}

export function peekSessionHistoryCount(sessionId: string): number | undefined {
  const sid = usableSessionId(sessionId)
  if (!sid) return undefined
  const snap = readHistory(sid)
  return snap?.ids.length
}

/** 首次写入允许时盖章。已有水位不改（前进只走 persist）。读不到库则不盖，下一轮失败关闭。 */
export function stampSessionAllowWatermark(sessionId: string): void {
  const sid = usableSessionId(sessionId)
  if (!sid || watermarks.has(sid)) return
  const snap = readHistory(sid)
  if (!snap) return
  watermarks.set(sid, {
    idHash: hashSessionMessageIds(snap.ids),
    messageCount: snap.ids.length
  })
}

/** 历史变长且旧水位前缀仍对得上才前推。截断或缺库不改，留给对账清表。 */
export function advanceSessionAllowWatermark(sessionId: string): void {
  const sid = usableSessionId(sessionId)
  if (!sid) return
  const current = watermarks.get(sid)
  if (!current) return
  const snap = readHistory(sid)
  if (!snap) return
  if (snap.ids.length < current.messageCount) return
  if (hashSessionMessageIds(snap.ids.slice(0, current.messageCount)) !== current.idHash) return
  if (snap.ids.length === current.messageCount) return
  watermarks.set(sid, {
    idHash: hashSessionMessageIds(snap.ids),
    messageCount: snap.ids.length
  })
}

export function resetSessionAllowWatermark(sessionId: string): void {
  const sid = usableSessionId(sessionId)
  if (sid) watermarks.delete(sid)
}

export function resetAllSessionAllowWatermarks(): void {
  watermarks.clear()
}

/** true = 应清表。无水位 / 读不到库 / 前缀对不上 / 条数变少 / 入参比库短。 */
export function sessionAllowHistoryLooksTruncated(
  sessionId: string,
  incomingCount?: number
): boolean {
  const sid = usableSessionId(sessionId)
  if (!sid) return true
  const mark = watermarks.get(sid)
  if (!mark) return true
  const snap = readHistory(sid)
  if (!snap) return true
  if (snap.ids.length < mark.messageCount) return true
  if (hashSessionMessageIds(snap.ids.slice(0, mark.messageCount)) !== mark.idHash) return true
  if (incomingCount != null && incomingCount < snap.ids.length) return true
  return false
}
