/**
 * P2 列表边界 soft：线程 virtua 找条 / 引用 / 刻度 / 还原共用 scrollToIndex 入口。
 * 虚拟化后 DOM 可能未挂载，禁只靠 scrollIntoView 碰巧过门。
 */
type ThreadVirtuaScroller = {
  scrollToMessageId: (messageId: string) => boolean
}

let scroller: ThreadVirtuaScroller | null = null

export function registerThreadVirtuaScroller(next: ThreadVirtuaScroller | null): void {
  scroller = next
}

/** @returns true 已交给 virtua scrollToIndex */
export function scrollThreadVirtuaToMessage(messageId: string): boolean {
  if (!messageId || !scroller) return false
  return scroller.scrollToMessageId(messageId)
}

export function hasThreadVirtuaScroller(): boolean {
  return scroller != null
}
