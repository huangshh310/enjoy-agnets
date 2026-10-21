/**
 * 同一手势的 agent.run clientRequestId。
 * 发送 / 再发一次 / 再试一次 / Enter 各发新 id；误触连点复用。
 */
let inFlightClientRequestId: string | null = null

export function takeClientRequestId(existing?: string): string {
  if (existing) {
    inFlightClientRequestId = existing
    return existing
  }
  if (!inFlightClientRequestId) inFlightClientRequestId = crypto.randomUUID()
  return inFlightClientRequestId
}

export function releaseClientRequestId(id: string): void {
  if (inFlightClientRequestId === id) inFlightClientRequestId = null
}

/** 起步窗口里用户点了停止：在路上那一发作废，交出它的 id（记成已停止），下一发另开新 id。 */
export function abandonInFlightClientRequestId(): string | null {
  const id = inFlightClientRequestId
  inFlightClientRequestId = null
  return id
}

export function peekClientRequestIdForTest(): string | null {
  return inFlightClientRequestId
}

export function resetClientRequestIdForTest(): void {
  inFlightClientRequestId = null
}
