/**
 * ⌘L 搜当前线程消息。满 2 个字符才搜，最近的在前。
 * 找条 / 刻度 / 引用跳转：优先 messageId → virtua scrollToIndex（虚拟化后 DOM 可能未挂）。
 * 滚定后共用 data-thread-find-active 短 accent rim（≤~400ms；减动静帧不自动灭）。
 */
import { requestTurnReveal } from "./thread-turn-reveal.ts"
import { hasThreadVirtuaScroller, scrollThreadVirtuaToMessage } from "./thread-virtua-scroll.ts"

export type ThreadMessageHit = {
  id: string
  role: "user" | "assistant"
  preview: string
}

const FIND_ACTIVE_RING = ["ring-2", "ring-accent-500"] as const
const FIND_ACTIVE_MS = 400
const FIND_ACTIVE_MAX_TRIES = 24

let findActiveNode: HTMLElement | null = null
let findActiveClearTimer: ReturnType<typeof setTimeout> | undefined
let findActiveGeneration = 0

function clearFindActiveMark(): void {
  if (findActiveClearTimer !== undefined) {
    clearTimeout(findActiveClearTimer)
    findActiveClearTimer = undefined
  }
  if (!findActiveNode) return
  findActiveNode.removeAttribute("data-thread-find-active")
  findActiveNode.classList.remove(...FIND_ACTIVE_RING)
  findActiveNode = null
}

/** 清掉当前短高亮，并取消未完成的挂载重试。找条关闭 / 切条 cleanup 用。 */
export function clearThreadFindActive(): void {
  findActiveGeneration += 1
  clearFindActiveMark()
}

/**
 * 共用短 accent rim：data-thread-find-active + ring-2 ring-accent-500。
 * 新跳转先清旧 rim；virtua 未挂载时 rAF 重试；减动偏好下静帧 rim（不按 timer 灭）。
 */
export function flashThreadFindActive(messageId: string): void {
  if (!messageId) return
  findActiveGeneration += 1
  const generation = findActiveGeneration
  clearFindActiveMark()

  let tries = 0
  const tick = () => {
    if (generation !== findActiveGeneration) return
    const node = document.querySelector(`[data-thread-message="${CSS.escape(messageId)}"]`)
    if (node instanceof HTMLElement) {
      findActiveNode = node
      node.setAttribute("data-thread-find-active", "true")
      node.classList.add(...FIND_ACTIVE_RING)
      const reduce =
        typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
      if (!reduce) {
        findActiveClearTimer = setTimeout(() => {
          if (generation !== findActiveGeneration) return
          clearFindActiveMark()
        }, FIND_ACTIVE_MS)
      }
      return
    }
    tries += 1
    if (tries > FIND_ACTIVE_MAX_TRIES) return
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(tick)
    else setTimeout(tick, 16)
  }
  tick()
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
  // 找条 / 刻度 / 引用 / 快搜 / subagent pill：滚定后共用短 rim。
  flashThreadFindActive(messageId)
}
