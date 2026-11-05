/**
 * P2 侧栏 SessionList virtua：sessionId → index → scrollToIndex 共用入口。
 * 虚拟化后 DOM 可能未挂载，禁只靠 scrollIntoView 碰巧过门。
 */
type SessionListVirtuaScroller = {
  scrollToSessionId: (sessionId: string) => boolean
}

const scrollers = new Set<SessionListVirtuaScroller>()

export function registerSessionListVirtuaScroller(next: SessionListVirtuaScroller | null): () => void {
  if (!next) return () => {}
  scrollers.add(next)
  return () => {
    scrollers.delete(next)
  }
}

/** @returns true 已交给某列表 virtua scrollToIndex */
export function scrollSessionListVirtuaToSession(sessionId: string): boolean {
  if (!sessionId) return false
  for (const scroller of scrollers) {
    if (scroller.scrollToSessionId(sessionId)) return true
  }
  return false
}

export function hasSessionListVirtuaScroller(): boolean {
  return scrollers.size > 0
}

const SCROLL_FLASH_RING = ["ring-2", "ring-accent-500"] as const
const SCROLL_FLASH_MS = 400
const SCROLL_FLASH_MAX_TRIES = 24

let flashNode: HTMLElement | null = null
let flashClearTimer: ReturnType<typeof setTimeout> | undefined
let flashGeneration = 0

function clearScrollFlashMark(): void {
  if (flashClearTimer !== undefined) {
    clearTimeout(flashClearTimer)
    flashClearTimer = undefined
  }
  if (!flashNode) return
  flashNode.removeAttribute("data-session-scroll-flash")
  flashNode.classList.remove(...SCROLL_FLASH_RING)
  flashNode = null
}

export function clearSessionScrollFlash(): void {
  flashGeneration += 1
  clearScrollFlashMark()
}

/**
 * 滚定后短 accent rim：data-session-scroll-flash + ring-2 ring-accent-500。
 * ≤~400ms 自动灭；prefers-reduced-motion: reduce → 静帧 rim 不按 timer 灭。
 */
export function flashSessionScrollActive(sessionId: string): void {
  if (!sessionId) return
  flashGeneration += 1
  const generation = flashGeneration
  clearScrollFlashMark()

  let tries = 0
  const tick = () => {
    if (generation !== flashGeneration) return
    const node = document.querySelector(
      `[data-testid="sidebar-session-row"][data-session-id="${CSS.escape(sessionId)}"][data-session-surface="tree"]`
    )
    if (node instanceof HTMLElement) {
      flashNode = node
      node.setAttribute("data-session-scroll-flash", "true")
      node.classList.add(...SCROLL_FLASH_RING)
      const reduce =
        typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
      if (!reduce) {
        flashClearTimer = setTimeout(() => {
          if (generation !== flashGeneration) return
          clearScrollFlashMark()
        }, SCROLL_FLASH_MS)
      }
      return
    }
    tries += 1
    if (tries > SCROLL_FLASH_MAX_TRIES) return
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(tick)
    else setTimeout(tick, 16)
  }
  tick()
}

/** 选中 / 跳回：sessionId → virtua scrollToIndex，再短高亮。 */
export function revealSidebarSession(sessionId: string): boolean {
  if (!sessionId) return false
  const ok = scrollSessionListVirtuaToSession(sessionId)
  if (ok) flashSessionScrollActive(sessionId)
  return ok
}
