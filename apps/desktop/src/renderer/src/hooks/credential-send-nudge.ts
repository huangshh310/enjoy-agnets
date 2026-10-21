/**
 * luna P2（#163 巡检 m211-29c/d）：密钥没通过时按 Enter / 点发送被发送闸拦下，卡还是原来那张，看起来什么都没发生。
 * 被拦的那一刻按会话记一笔，「密钥没通过」卡上补一行「先改好密钥再发。」——绝不静默。
 * 下一次真正放行的发送（闸通过）就清掉。纯模块，测试直接调。
 * 没有会话（落地页 / 新对话）记在空名下：从落地页发、被拦下后那个空会话会被删掉、回到落地页，卡要照样看得到（luna P2）。
 */
let blocked: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

/** 会话 → 提醒的键；没有会话 = 落地页。 */
export function credentialNudgeKey(sessionId: string | null | undefined): string {
  return sessionId ?? ""
}

function emit(): void {
  for (const listener of listeners) listener()
}

export function noteCredentialSendBlocked(sessionId: string | null | undefined): void {
  const key = credentialNudgeKey(sessionId)
  if (blocked.has(key)) return
  blocked = new Set([...blocked, key])
  emit()
}

export function clearCredentialSendBlocked(sessionId: string | null | undefined): void {
  const key = credentialNudgeKey(sessionId)
  if (!blocked.has(key)) return
  const next = new Set(blocked)
  next.delete(key)
  blocked = next
  emit()
}

export function credentialSendBlocked(sessionId: string | null | undefined): boolean {
  return blocked.has(credentialNudgeKey(sessionId))
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
