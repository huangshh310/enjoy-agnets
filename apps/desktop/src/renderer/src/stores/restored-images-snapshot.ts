/**
 * leo r4 soft4：白卡「图片已放回…」只说这次回滚真还回了几张图——在还稿那一刻拍快照，
 * 不实时数输入框（回滚后再贴的图不算，只回了字的回滚之后贴图也不说「文字和图片已放回」）。
 * 新一轮开跑（running=true）清掉；只对拍快照的那个会话有效。
 */
import { isImageMediaType } from "@enjoy-agents/assets/media-type"

export type RestoredImagesSnapshot = { sessionId: string; images: number; hasText: boolean }

let snapshot: RestoredImagesSnapshot | null = null
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function noteRestoredImages(
  sessionId: string | null,
  assets: readonly { mediaType?: string }[],
  restoredText: string
): void {
  snapshot = sessionId
    ? {
        sessionId,
        images: assets.filter((a) => isImageMediaType(a.mediaType ?? "")).length,
        hasText: restoredText.trim().length > 0
      }
    : null
  notify()
}

export function clearRestoredImages(): void {
  if (!snapshot) return
  snapshot = null
  notify()
}

export function restoredImagesFor(sessionId: string | null): RestoredImagesSnapshot | null {
  return snapshot && sessionId && snapshot.sessionId === sessionId ? snapshot : null
}

export function getRestoredImagesSnapshot(): RestoredImagesSnapshot | null {
  return snapshot
}

export function subscribeRestoredImages(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
