/**
 * 本会话允许表的历史水位：授权时记下最后一条消息 id + 条数。
 * 种子前对库；水位消息没了或条数变少则清。拿不准就清。
 * 后续普通轮 persist 只把水位向前推；清表时水位一起丢掉。
 */
import { getDatabase } from "./database"

export type SessionAllowWatermark = {
  lastMessageId: string
  messageCount: number
}

export type SessionHistorySnapshot = {
  ids: string[]
}

export type SessionHistoryReader = (sessionId: string) => SessionHistorySnapshot | undefined

const watermarks = new Map<string, SessionAllowWatermark>()

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

/** 首次写入允许时盖章。已有水位不改（前进只走 persist）。读不到库则不盖，下一轮失败关闭。 */
export function stampSessionAllowWatermark(sessionId: string): void {
  const sid = usableSessionId(sessionId)
  if (!sid || watermarks.has(sid)) return
  const snap = readHistory(sid)
  if (!snap) return
  watermarks.set(sid, {
    lastMessageId: snap.ids[snap.ids.length - 1] ?? "",
    messageCount: snap.ids.length
  })
}

/** 历史变长且旧水位仍在时才前推。截断或缺库不改，留给对账清表。 */
export function advanceSessionAllowWatermark(sessionId: string): void {
  const sid = usableSessionId(sessionId)
  if (!sid) return
  const current = watermarks.get(sid)
  if (!current) return
  const snap = readHistory(sid)
  if (!snap) return
  if (current.lastMessageId && !snap.ids.includes(current.lastMessageId)) return
  if (snap.ids.length <= current.messageCount) return
  watermarks.set(sid, {
    lastMessageId: snap.ids[snap.ids.length - 1] ?? "",
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

/** true = 应清表。无水位 / 读不到库 / 水位消息没了 / 条数变少。 */
export function sessionAllowHistoryLooksTruncated(sessionId: string): boolean {
  const sid = usableSessionId(sessionId)
  if (!sid) return true
  const mark = watermarks.get(sid)
  if (!mark) return true
  const snap = readHistory(sid)
  if (!snap) return true
  if (snap.ids.length < mark.messageCount) return true
  if (mark.lastMessageId && !snap.ids.includes(mark.lastMessageId)) return true
  return false
}
