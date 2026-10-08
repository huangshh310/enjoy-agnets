/**
 * 在改栈的同一刻决定要不要位移。
 * 恢复会话会把前台 running 停进 park，不能等动画 effect 再读。
 */
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import { useChatStore } from "@renderer/stores/chat-store"
import { shouldSkipHistorySlide, type HistorySlide } from "./history-slide"
import type { HistoryEntry } from "./nav-history.types"

export function slideForTravel(direction: HistorySlide, next: HistoryEntry): HistorySlide | null {
  if (shouldSkipHistorySlide({
    sourceRunning: useChatStore.getState().running,
    destinationRunning: destinationRunning(next),
    reduceMotion: prefersReducedMotion()
  })) return null
  return direction
}

function destinationRunning(entry: HistoryEntry): boolean {
  const sessionId = entry.params?.kind === "session" ? entry.params.sessionId : undefined
  if (!sessionId) return false
  return useAttentionStore.getState().parks[sessionId]?.running === true
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
