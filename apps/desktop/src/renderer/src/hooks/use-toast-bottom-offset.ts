/**
 * 订阅 Composer / Dock / 页脚 [data-toast-clearance]，写入 CSS 变量并回传底边。
 */
import { useEffect, useState } from "react"
import { APP_TOAST_BOTTOM_OFFSET } from "@/components/ui/sonner"
import {
  APP_TOAST_CLEARANCE_GAP,
  applyToastBottomCssVar,
  TOAST_CLEARANCE_SELECTOR,
  toastBottomOffsetFromClearance
} from "../lib/toast-bottom-offset"

export function useToastBottomOffset(): number {
  const [offset, setOffset] = useState(APP_TOAST_BOTTOM_OFFSET)
  useEffect(() => subscribeToastClearance(setOffset), [])
  return offset
}

function readToastBottomOffset(): number {
  const nodes = document.querySelectorAll(TOAST_CLEARANCE_SELECTOR)
  return toastBottomOffsetFromClearance({
    viewportHeight: window.innerHeight,
    rects: [...nodes].map((node) => node.getBoundingClientRect()),
    fallback: APP_TOAST_BOTTOM_OFFSET,
    gap: APP_TOAST_CLEARANCE_GAP
  })
}

function subscribeToastClearance(setOffset: (value: number) => void): () => void {
  const ro = new ResizeObserver(() => setOffset(readToastBottomOffset()))
  let watched = new Set<Element>()
  const syncTargets = () => {
    const next = new Set<Element>([
      document.documentElement,
      ...document.querySelectorAll(TOAST_CLEARANCE_SELECTOR)
    ])
    for (const node of watched) if (!next.has(node)) ro.unobserve(node)
    for (const node of next) if (!watched.has(node)) ro.observe(node)
    watched = next
    const nextOffset = readToastBottomOffset()
    applyToastBottomCssVar(nextOffset, document.documentElement)
    setOffset(nextOffset)
  }
  let frame = 0
  const schedule = () => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      syncTargets()
    })
  }
  const mo = new MutationObserver(schedule)
  mo.observe(document.body, { childList: true, subtree: true })
  window.addEventListener("hashchange", schedule)
  syncTargets()
  return () => {
    mo.disconnect()
    ro.disconnect()
    window.removeEventListener("hashchange", schedule)
    cancelAnimationFrame(frame)
  }
}
