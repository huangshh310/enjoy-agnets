/**
 * 每个会话最后一次 usage.updated。没有事件就不造数字。
 */

export type SessionUsage = {
  inputTokens: number
  outputTokens?: number
}

const bySession = new Map<string, SessionUsage>()
let version = 0
const listeners = new Set<() => void>()

/** 新一轮 run.start 清掉上一轮，避免旧数字被标成本轮实测。 */
export function clearSessionUsage(sessionId: string): void {
  if (!bySession.delete(sessionId)) return
  bump()
}

export function rememberSessionUsage(
  sessionId: string,
  usage: { inputTokens?: number; outputTokens?: number }
): void {
  if (typeof usage.inputTokens !== "number" || usage.inputTokens < 0) return
  bySession.set(sessionId, {
    inputTokens: usage.inputTokens,
    ...(typeof usage.outputTokens === "number" ? { outputTokens: usage.outputTokens } : {})
  })
  bump()
}

function bump(): void {
  version += 1
  for (const listener of listeners) listener()
}

export function subscribeSessionUsage(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function sessionUsageVersion(): number {
  return version
}

export function sessionUsageFor(sessionId: string | null): SessionUsage | null {
  if (!sessionId) return null
  return bySession.get(sessionId) ?? null
}
