/**
 * 发出一句后对话要贴底（mike P3，#163 巡检 52：发「普通一句」后停在上面一条，右下有 ↓）。
 * 规则（host #170 定，反过来写）：同一个会话里最后一条用户消息换了 → 贴底，**默认就滚**。
 * 用户自己的各种发送（输入框发送 / 插话、动作 chip、计划卡「执行计划」、ACP 斜杠命令、设计模式 / diff 评论插话……）
 * 只要冒出一条新的用户消息就滚，都不用登记，新入口也不会漏。
 * 注意（leo）：「再发一次」/ 重新生成沿用原来那条用户消息的 id，最后一条用户消息没换，所以它们**不**触发这里的贴底。
 * 排队区「继续」是用户点的：解除暂停后自启发出的第一条照常贴底（markQueueResumedByUser，luna #170 r-luna ②）。
 * 只有两条路不是用户刚发的、不该把正往上翻着看历史的人拽回底部：排队那条自己发出去、重来（从这里重来截掉后面）。
 * 它们发之前各打一个一次性的「这次别滚」记号，下一次「最后一条用户消息换了」时取走。
 * - 切会话不算（那是首屏贴底，StickToBottom 自己管）；用户消息没变（助手在出字、工具卡更新）也不算。
 * - 记号只管同一会话、10 秒内；排队那条发送结束了记号还没被取走（被拦下 / 没发出去，用户消息没换）就当场撤掉
 *   （dropSkipSendScroll），不会留着吞掉后面用户自己那一发的贴底。重来截完一条用户消息都不剩时不打记号。
 */
export type SendScrollMark = { sessionId: string | null; lastUserId: string | null }

/** 打了「这次别滚」后多久内出现的用户消息变化算它的（排队发出要等起跑、重来要等截断回执，留足余量）。 */
export const SKIP_SCROLL_WINDOW_MS = 10_000

type SkipMark = { sessionId: string | null; at: number }

let skip: SkipMark | null = null

/** 排队那条自己发出去、重来：发之前打一个一次性的「这次别滚」记号。返回这个记号，发完没用上时拿它撤。 */
export function skipNextSendScroll(sessionId: string | null | undefined, now: number = Date.now()): object {
  const mark: SkipMark = { sessionId: sessionId ?? null, at: now }
  skip = mark
  return mark
}

/** 撤掉自己打的、还没被取走的记号（别人后来打的不动）。 */
export function dropSkipSendScroll(mark: object): void {
  if (skip === mark) skip = null
}

/** 取走记号：同一会话且没过期才算「这次别滚」；不管算不算，取一次就清（一次性，不会留着吞下一次）。 */
export function takeSkipSendScroll(sessionId: string | null, now: number = Date.now()): boolean {
  const mark = skip
  skip = null
  if (!mark) return false
  if (mark.sessionId !== sessionId) return false
  return now - mark.at <= SKIP_SCROLL_WINDOW_MS
}

/**
 * 用户点了排队区的「继续」（luna #170 r-luna ②）：解除暂停后自启发出的那一条是用户要发的，要贴底。
 * 记一个一次性的「用户刚点了继续」：同会话、10 秒内，下一次排队自启发送取走它、不打「这次别滚」。
 */
type ResumeMark = { sessionId: string; at: number }
let resumed: ResumeMark | null = null

export function markQueueResumedByUser(sessionId: string | null | undefined, now: number = Date.now()): void {
  resumed = sessionId ? { sessionId, at: now } : null
}

/**
 * 排队那条自己发出去之前调用：刚点过「继续」（同会话、没过期）→ 取走那个记号，不打「这次别滚」，返回 null（照常贴底）；
 * 否则打「这次别滚」，返回记号（发完没用上时拿它 dropSkipSendScroll）。
 */
export function markQueuedAutoSend(sessionId: string | null | undefined, now: number = Date.now()): object | null {
  const mark = resumed
  resumed = null
  if (mark && mark.sessionId === sessionId && now - mark.at <= SKIP_SCROLL_WINDOW_MS) return null
  return skipNextSendScroll(sessionId, now)
}

/**
 * 排队那条自己发出去（useFollowupAutostart 的 send）：发之前按 markQueuedAutoSend 打 / 不打「这次别滚」；
 * 发完最后一条用户消息根本没换（被拦下 / 没发出去）→ 撤掉自己打的记号，不留着吞后面用户自己那一发的贴底。
 * 只看「最后一条用户消息变没变」，不和对话区取记号的那次渲染抢先后。
 */
export async function runQueuedAutoSend(
  sessionId: string | null | undefined,
  lastUserId: () => string | null,
  send: () => Promise<void>
): Promise<void> {
  const before = lastUserId()
  const mark = markQueuedAutoSend(sessionId)
  try {
    await send()
  } finally {
    if (mark && lastUserId() === before) dropSkipSendScroll(mark)
  }
}

/** 测试用：清掉记号。 */
export function resetSkipSendScrollForTest(): void {
  skip = null
  resumed = null
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

/** 最后一条用户消息换了就贴底，除非这次是排队自动发出 / 重来打了「这次别滚」（只在换了时才取记号）。 */
export function shouldScrollOnSend(prev: SendScrollMark, next: SendScrollMark, skipThisOne: () => boolean): boolean {
  return lastUserChanged(prev, next) && !skipThisOne()
}
