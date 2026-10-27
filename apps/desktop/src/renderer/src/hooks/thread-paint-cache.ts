/**
 * 切会话时先画上次离开的转录，避免先空白再等库。
 * 只留数组引用，不拷贝正文。库返回后内容变了再换，避免把整段 Markdown 重挂一遍。
 */

const THREAD_PAINT_CACHE_LIMIT = 8

export type ThreadPaintMessage = {
  id?: string
  content?: string
  reasoning?: string
  streaming?: boolean
  thoughtSeconds?: number
  tools?: ReadonlyArray<{ id?: string; state?: string }>
  assets?: ReadonlyArray<{ assetId?: string }>
}

const cache = new Map<string, readonly ThreadPaintMessage[]>()

/** 记住离开时的转录。空转录不留，免得把已经清空的会话再画出来。 */
export function rememberThread(sessionId: string, messages: readonly ThreadPaintMessage[]): void {
  cache.delete(sessionId)
  if (!sessionId || messages.length === 0) return
  cache.set(sessionId, messages)
  while (cache.size > THREAD_PAINT_CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (!oldest) break
    cache.delete(oldest)
  }
}

export function clearThreadPaintCache(): void {
  cache.clear()
}

/**
 * 离开 A 时记下 A，再取 B 上次的转录。
 * 没看过 B 就返回空数组，调用方继续走空白占位，不拿 A 的内容顶上。
 */
export function messagesForSessionSwitch<T extends ThreadPaintMessage>(input: {
  leavingSessionId: string | null
  leavingMessages: readonly T[]
  nextSessionId: string
}): readonly T[] {
  if (input.leavingSessionId && input.leavingSessionId !== input.nextSessionId) {
    rememberThread(input.leavingSessionId, input.leavingMessages)
  }
  const hit = cache.get(input.nextSessionId)
  if (!hit) return []
  cache.delete(input.nextSessionId)
  cache.set(input.nextSessionId, hit)
  return hit as readonly T[]
}

/** 正文、推理、工具状态或附件变了才值得重挂。同一引用直接跳过。 */
export function shouldReplaceThreadPaint(
  current: readonly ThreadPaintMessage[],
  next: readonly ThreadPaintMessage[]
): boolean {
  if (current === next) return false
  return threadPaintStamp(current) !== threadPaintStamp(next)
}

export function threadPaintStamp(messages: readonly ThreadPaintMessage[]): string {
  let hash = messages.length
  for (const message of messages) {
    hash = mix(hash, message.id ?? "")
    hash = mix(hash, message.streaming ? "1" : "0")
    hash = mix(hash, String(message.thoughtSeconds ?? ""))
    hash = mix(hash, message.content ?? "")
    hash = mix(hash, message.reasoning ?? "")
    for (const tool of message.tools ?? []) hash = mix(hash, `${tool.id ?? ""}:${tool.state ?? ""}`)
    for (const asset of message.assets ?? []) hash = mix(hash, asset.assetId ?? "")
  }
  return `${messages.length}:${hash}`
}

function mix(hash: number, text: string): number {
  let next = hash
  for (let index = 0; index < text.length; index += 1) {
    next = ((next << 5) + next + text.charCodeAt(index)) | 0
  }
  return next
}
