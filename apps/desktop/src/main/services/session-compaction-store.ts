/**
 * 会话压缩状态：内存缓存 + settings 表。
 */
import { SessionCompaction } from "@enjoy-agents/ipc-contract"
import { getDatabase, getSetting, setSetting } from "./database"

const COMPACTION_PREFIX = "session_compaction:"
const memoryCache = new Map<string, SessionCompaction>()

/** 获取当前会话的压缩状态（优先缓存，次之 SQLite） */
export async function getSessionCompaction(
  sessionId: string
): Promise<SessionCompaction | null> {
  if (memoryCache.has(sessionId)) {
    return memoryCache.get(sessionId) ?? null
  }
  const raw = getSetting(`${COMPACTION_PREFIX}${sessionId}`)
  if (!raw) return null
  try {
    const parsed = SessionCompaction.parse(JSON.parse(raw))
    memoryCache.set(sessionId, parsed)
    return parsed
  } catch {
    return null
  }
}

export function persistSessionCompaction(compaction: SessionCompaction): void {
  memoryCache.set(compaction.sessionId, compaction)
  setSetting(`${COMPACTION_PREFIX}${compaction.sessionId}`, JSON.stringify(compaction))
}

/** 清除当前会话的压缩状态 */
export async function clearSessionCompaction(
  sessionId: string
): Promise<{ success: boolean }> {
  memoryCache.delete(sessionId)
  getDatabase()
    .prepare("DELETE FROM settings WHERE key = ?")
    .run(`${COMPACTION_PREFIX}${sessionId}`)
  return { success: true }
}
