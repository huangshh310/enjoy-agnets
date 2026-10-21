/**
 * 同一手势的 agent.run clientRequestId，按会话各管各的（main 去重的键也是 会话 + id）。
 * 发送 / 再发一次 / 再试一次 / Enter 各发新 id；同一会话里误触连点复用。
 * leo #169 BLOCK：原来全局只有一个，B 会沿用 A 在路上的 id，B 里点停止就把 A 那一发停了；A 先跑完还会把 B 的 id 放掉。
 * 建会话窗（还没有会话）记在空会话名下，会话建好后续发那一下按新会话接手同一个 id。
 */
const inFlight = new Map<string, string>()

function keyOf(sessionId: string | null | undefined): string {
  return sessionId ?? ""
}

export function takeClientRequestId(sessionId: string | null | undefined, existing?: string): string {
  const key = keyOf(sessionId)
  if (existing) {
    inFlight.set(key, existing)
    return existing
  }
  const held = inFlight.get(key)
  if (held) return held
  const fresh = crypto.randomUUID()
  inFlight.set(key, fresh)
  return fresh
}

export function releaseClientRequestId(sessionId: string | null | undefined, id: string): void {
  const key = keyOf(sessionId)
  if (inFlight.get(key) === id) inFlight.delete(key)
}

/** 起步窗口里用户在这个会话点了停止：这个会话在路上那一发作废，交出它的 id（记成已停止），下一发另开新 id。别的会话不动。 */
export function abandonInFlightClientRequestId(sessionId: string | null | undefined): string | null {
  const key = keyOf(sessionId)
  const id = inFlight.get(key) ?? null
  inFlight.delete(key)
  return id
}

/** 不传会话：任意一个还挂着的 id（只给测试看「有没有挂着」）。 */
export function peekClientRequestIdForTest(sessionId?: string | null): string | null {
  if (sessionId !== undefined) return inFlight.get(keyOf(sessionId)) ?? null
  return inFlight.values().next().value ?? null
}

export function resetClientRequestIdForTest(): void {
  inFlight.clear()
}
