/**
 * 发出一句后对话要贴底（mike P3，#163 巡检 52：发「普通一句」后停在上面一条，右下有 ↓）。
 * 判定只看「同一个会话里，最后一条用户消息换了」：切会话不算（那是首屏贴底，StickToBottom 自己管），
 * 用户消息没变（助手在出字、工具卡更新）也不算。
 */
export type SendScrollMark = { sessionId: string | null; lastUserId: string | null }

export function lastUserMessageId(messages: ReadonlyArray<{ id: string; role: string }>): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role === "user") return message.id
  }
  return null
}

export function shouldScrollOnSend(prev: SendScrollMark, next: SendScrollMark): boolean {
  if (prev.sessionId !== next.sessionId) return false
  if (!next.lastUserId) return false
  return next.lastUserId !== prev.lastUserId
}
