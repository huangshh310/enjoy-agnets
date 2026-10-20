/**
 * 窗口高 ≤600（矮窗）：和审批卡、排队区的 [@media(max-height:600px)] 同一道线。
 */
import { useSyncExternalStore } from "react"

export const SHORT_WINDOW_QUERY = "(max-height: 600px)"

function query(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(SHORT_WINDOW_QUERY) : null
}

function subscribe(listener: () => void): () => void {
  const list = query()
  if (!list) return () => undefined
  list.addEventListener?.("change", listener)
  return () => list.removeEventListener?.("change", listener)
}

export function useShortWindow(): boolean {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? false, () => false)
}
