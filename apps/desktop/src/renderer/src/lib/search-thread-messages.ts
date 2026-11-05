/**
 * ⌘L 搜当前线程消息。满 2 个字符才搜，最近的在前。
 * 找条 / 刻度 / 引用跳转：优先 messageId → virtua scrollToIndex（虚拟化后 DOM 可能未挂）。
 */
import { requestTurnReveal } from "./thread-turn-reveal.ts"
import { hasThreadVirtuaScroller, scrollThreadVirtuaToMessage } from "./thread-virtua-scroll.ts"

export type ThreadMessageHit = {
  id: string
  role: "user" | "assistant"
  preview: string
}

export function searchThreadMessages(
  messages: Array<{ id: string; role: string; content: string }>,
  query: string,
  limit = 8
): ThreadMessageHit[] {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return []
  const hits: ThreadMessageHit[] = []
  for (let index = messages.length - 1; index >= 0 && hits.length < limit; index -= 1) {
    const message = messages[index]
    if (message?.role !== "user" && message?.role !== "assistant") continue
    const text = message.content.replace(/\s+/g, " ").trim()
    if (!text.toLowerCase().includes(needle)) continue
    hits.push({
      id: message.id,
      role: message.role,
      preview: text.slice(0, 96)
    })
  }
  return hits
}

export function revealThreadMessage(messageId: string) {
  requestTurnReveal(messageId)
  const scroll = () => {
    // Must：有 virtua 注册时必须走 index scrollTo；未注册（空壳）才退回 DOM。
    if (hasThreadVirtuaScroller()) {
      scrollThreadVirtuaToMessage(messageId)
      return
    }
    document
      .querySelector(`[data-thread-message="${CSS.escape(messageId)}"]`)
      ?.scrollIntoView({ block: "center" })
  }
  scroll()
  // deferred / virtua 挂载要等一帧；再补一次短延时，避免刻度点名时只滚到占位高度。
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(scroll)
  if (typeof setTimeout === "function") setTimeout(scroll, 50)
}
