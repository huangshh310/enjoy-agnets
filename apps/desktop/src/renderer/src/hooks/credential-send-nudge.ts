/**
 * luna P2（#163 巡检 m211-29c/d）：密钥没通过时按 Enter / 点发送被发送闸拦下，卡还是原来那张，看起来什么都没发生。
 * 被拦的那一刻按会话记一笔，「密钥没通过」卡上补一行「先改好密钥再发。」——绝不静默。
 * 下一次真正放行的发送（闸通过）就清掉。纯模块，测试直接调。
 */
let blocked: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function noteCredentialSendBlocked(sessionId: string | null | undefined): void {
  if (!sessionId || blocked.has(sessionId)) return
  blocked = new Set([...blocked, sessionId])
  emit()
}

export function clearCredentialSendBlocked(sessionId: string | null | undefined): void {
  if (!sessionId || !blocked.has(sessionId)) return
  const next = new Set(blocked)
  next.delete(sessionId)
  blocked = next
  emit()
}

export function credentialSendBlocked(sessionId: string | null | undefined): boolean {
  return Boolean(sessionId && blocked.has(sessionId))
}

export function getCredentialSendBlocked(): ReadonlySet<string> {
  return blocked
}

export function subscribeCredentialSendBlocked(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 测试用。 */
export function resetCredentialSendNudgeForTest(): void {
  blocked = new Set()
  emit()
}

/** 卡上第二行：被拦过就先说「先改好密钥再发。」，原来的「…已放回输入框」跟在后面（中文句号后直接接，英文空一格）。 */
export function credentialInvalidDetail(nudge: string | null, restored: string | null | undefined): string | null {
  if (!nudge) return restored ?? null
  if (!restored) return nudge
  return /[。！？]$/.test(nudge) ? `${nudge}${restored}` : `${nudge} ${restored}`
}
