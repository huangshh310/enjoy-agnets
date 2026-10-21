/**
 * 发出一句后对话要贴底（mike P3，#163 巡检 52：发「普通一句」后停在上面一条，右下有 ↓）。
 * 判定：同一个会话里最后一条用户消息换了，**而且是用户自己刚点了发送**（leo #170 soft-2）。
 * - 切会话不算（那是首屏贴底，StickToBottom 自己管）；用户消息没变（助手在出字、工具卡更新）也不算；
 * - 排队的那条自己发出去、重来改了最后一条：用户正往上翻着看历史时不拽回底部，右下原有的 ↓ 还在，想回去自己点。
 */
export type SendScrollMark = { sessionId: string | null; lastUserId: string | null }

/** 点了发送后多久内出现的新用户消息算这次发送的（首发要先建会话 / 准备，留足余量）。 */
export const USER_SEND_WINDOW_MS = 10_000

let userSend: { sessionId: string | null; at: number } | null = null

/** 跑着时按 Enter 是排队，不会马上出现用户消息；这时不记，免得排队的那条稍后自己发出去时被当成「刚点了发送」。 */
export function userSendQueues(running: boolean, requested: "send" | "steer"): boolean {
  return running && requested === "send"
}

/** 输入框发送 / 插话、排队行「立即发送 / 马上发给它」：用户自己点的发送，记一笔。 */
export function markUserSend(sessionId: string | null, now: number = Date.now()): void {
  userSend = { sessionId, at: now }
}

/** 取走记号：同一会话（新对话点发送时还没有会话也算）且没过期才算；取一次就清。 */
export function takeUserSend(sessionId: string | null, now: number = Date.now()): boolean {
  const mark = userSend
  userSend = null
  if (!mark) return false
  if (mark.sessionId !== null && mark.sessionId !== sessionId) return false
  return now - mark.at <= USER_SEND_WINDOW_MS
}

export function lastUserMessageId(messages: ReadonlyArray<{ id: string; role: string }>): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role === "user") return message.id
  }
  return null
}

/** 同一会话里最后一条用户消息换了（还不管是谁发的）。 */
export function lastUserChanged(prev: SendScrollMark, next: SendScrollMark): boolean {
  if (prev.sessionId !== next.sessionId) return false
  if (!next.lastUserId) return false
  return next.lastUserId !== prev.lastUserId
}

/** 最后一条用户消息换了，且是用户自己点的发送，才贴底。 */
export function shouldScrollOnSend(prev: SendScrollMark, next: SendScrollMark, userInitiated: () => boolean): boolean {
  return lastUserChanged(prev, next) && userInitiated()
}
