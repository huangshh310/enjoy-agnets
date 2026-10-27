/**
 * 查找、刻度、子任务跳转要先把那一轮挂上，再滚过去。
 * 屏外回合默认不挂 Markdown，只靠这个集合提前放行。
 */
const revealed = new Set<string>()
const listeners = new Set<() => void>()
let version = 0

export function requestTurnReveal(messageId: string): void {
  if (!messageId || revealed.has(messageId)) return
  revealed.add(messageId)
  version += 1
  for (const listener of listeners) listener()
}

export function isTurnRevealed(messageId: string): boolean {
  return revealed.has(messageId)
}

export function subscribeTurnReveal(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function turnRevealVersion(): number {
  return version
}
