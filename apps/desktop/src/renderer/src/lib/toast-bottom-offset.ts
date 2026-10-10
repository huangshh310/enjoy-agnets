/**
 * 全局 toast 底边：量贴底 clearance（Composer / 页脚 / 状态栏）顶边，
 * 不要再猜一个写死的高度。居中空会话 Composer 不抬。
 */
export const APP_TOAST_CLEARANCE_GAP = 8
export const TOAST_CLEARANCE_SELECTOR = "[data-toast-clearance]"

export type ToastClearanceRect = {
  top: number
  bottom: number
}

/**
 * 顶边落在视口下半才算贴底（Composer 在状态栏上方仍算）。
 * 空会话居中 Composer 在上半，忽略，避免 toast 飞到中间。
 */
export function toastBottomOffsetFromClearance(input: {
  viewportHeight: number
  rects: ToastClearanceRect[]
  fallback: number
  gap?: number
}): number {
  const gap = input.gap ?? APP_TOAST_CLEARANCE_GAP
  const mid = input.viewportHeight / 2
  let top: number | null = null
  for (const rect of input.rects) {
    if (rect.top < mid) continue
    if (top == null || rect.top < top) top = rect.top
  }
  if (top == null) return input.fallback
  return Math.max(input.fallback, Math.round(input.viewportHeight - top + gap))
}
