/**
 * leo BLOCK ④：会话上有 run 正在启动 / 落库（IPC 已进、runs 行还没写）时，onlyIfEmpty 删除必须拒绝。
 */
const starting = new Map<string, number>()

export function isSessionRunStarting(sessionId: string): boolean {
  return (starting.get(sessionId) ?? 0) > 0
}

export async function trackSessionRunStart<T>(raw: unknown, start: () => T | Promise<T>): Promise<T> {
  const sessionId =
    raw && typeof raw === "object" && typeof (raw as { sessionId?: unknown }).sessionId === "string"
      ? (raw as { sessionId: string }).sessionId
      : null
  if (!sessionId) return start()
  starting.set(sessionId, (starting.get(sessionId) ?? 0) + 1)
  try {
    return await start()
  } finally {
    const n = (starting.get(sessionId) ?? 1) - 1
    if (n > 0) starting.set(sessionId, n)
    else starting.delete(sessionId)
  }
}
