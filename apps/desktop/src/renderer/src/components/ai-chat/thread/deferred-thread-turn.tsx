/**
 * 屏外回合先占位，不挂 Markdown。末尾几轮、靠近滚动区、或被点名的那一轮才挂上。
 */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react"
import { isTurnRevealed, subscribeTurnReveal, turnRevealVersion } from "@renderer/lib/thread-turn-reveal"
import { shouldMountThreadTurn } from "./turn-mount-window"

export function DeferredThreadTurn({
  messageId,
  index,
  count,
  streaming,
  children
}: {
  messageId: string
  index: number
  count: number
  streaming: boolean
  children: ReactNode
}) {
  useSyncExternalStore(subscribeTurnReveal, turnRevealVersion)
  const revealed = isTurnRevealed(messageId)
  const eager = shouldMountThreadTurn({ index, count, revealed, near: false, streaming })
  const { ref, near } = useNearTurn(!eager)
  const mounted = eager || near
  return (
    <div
      ref={ref}
      data-thread-message={messageId}
      className={mounted ? undefined : "min-h-36"}
    >
      {mounted ? children : null}
    </div>
  )
}

/** 只在还没挂上时观察滚动容器。滚近了就挂，之后不再观察。 */
function useNearTurn(enabled: boolean): { ref: RefObject<HTMLDivElement | null>; near: boolean } {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    if (!enabled || near) return
    const node = ref.current
    if (!node || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true)
      },
      { root: scrollParent(node), rootMargin: "240px 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, near])
  return { ref, near }
}

function scrollParent(node: HTMLElement): Element | null {
  let current = node.parentElement
  while (current) {
    const overflow = getComputedStyle(current).overflowY
    if (overflow === "auto" || overflow === "scroll" || overflow === "overlay") return current
    current = current.parentElement
  }
  return null
}
