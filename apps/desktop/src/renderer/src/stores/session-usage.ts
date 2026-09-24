/**
 * 每个会话最后一次 usage.updated。没有事件就不造数字。
 */

export type SessionUsage = {
  inputTokens: number
  outputTokens?: number
  /** ACP usage_update.size：报出这次用量的那台引擎的窗口。 */
  contextWindow?: number
  /** 和 contextWindow 一起记下，换引擎后不再拿上一台的 size。 */
  contextRuntimeId?: string
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
  usage: { inputTokens?: number; outputTokens?: number; contextWindow?: number },
  runtimeId?: string
): void {
  const tokensOk = typeof usage.inputTokens === "number" && usage.inputTokens >= 0
  const windowOk = typeof usage.contextWindow === "number" && usage.contextWindow > 0
  if (!tokensOk && !windowOk) return
  const prev = bySession.get(sessionId)
  const sameEngine = !runtimeId || !prev?.contextRuntimeId || prev.contextRuntimeId === runtimeId
  bySession.set(sessionId, {
    inputTokens: tokensOk ? usage.inputTokens! : (prev?.inputTokens ?? 0),
    ...(typeof usage.outputTokens === "number" ? { outputTokens: usage.outputTokens } : {}),
    ...keptWindow(windowOk ? usage.contextWindow : undefined, sameEngine ? prev : undefined, runtimeId)
  })
  bump()
}

function keptWindow(
  next: number | undefined,
  prev: SessionUsage | undefined,
  runtimeId?: string
): Pick<SessionUsage, "contextWindow" | "contextRuntimeId"> {
  if (next && next > 0) return { contextWindow: next, ...(runtimeId ? { contextRuntimeId: runtimeId } : {}) }
  if (prev?.contextWindow) {
    return {
      contextWindow: prev.contextWindow,
      ...(prev.contextRuntimeId ? { contextRuntimeId: prev.contextRuntimeId } : {})
    }
  }
  return {}
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
