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

/** 贴底才按顶边抬高；否则回落 fallback（状态栏 / 自动化页脚）。 */
export function toastBottomOffsetFromClearance(input: {
  viewportHeight: number
  rects: ToastClearanceRect[]
  fallback: number
  gap?: number
}): number {
  const gap = input.gap ?? APP_TOAST_CLEARANCE_GAP
  let top: number | null = null
  for (const rect of input.rects) {
    if (input.viewportHeight - rect.bottom > input.fallback + gap) continue
    if (top == null || rect.top < top) top = rect.top
  }
  if (top == null) return input.fallback
  return Math.max(input.fallback, Math.round(input.viewportHeight - top + gap))
}
