/**
 * 全局 toast 底边：量贴底 Composer / Dock / 页脚高度，写入 CSS 变量。
 * 不要再猜写死的 56px——矮窗上 Composer 顶边会越过视口中线，旧算法会回落盖住芯片。
 */
export const APP_TOAST_CLEARANCE_GAP = 8
export const TOAST_CLEARANCE_SELECTOR = "[data-toast-clearance]"
export const TOAST_BOTTOM_CSS_VAR = "--app-toast-bottom-offset"
/** 底边距视口底不超过这个距离才算贴底（状态栏约 44px）。 */
export const TOAST_DOCKED_SLACK_PX = 96

export type ToastClearanceRect = {
  top: number
  bottom: number
}

export function isDockedClearance(
  rect: ToastClearanceRect,
  viewportHeight: number,
  slack = TOAST_DOCKED_SLACK_PX
): boolean {
  return viewportHeight - rect.bottom <= slack
}

/**
 * 贴底 clearance（Composer 簇 / Dock / 页脚）按顶边抬高 toast。
 * 居中空会话 Composer 底边远离视口底，忽略，回落 fallback（页脚/56）。
 * 高 Composer 顶边可越过中线，仍按贴底算，不要回落 56 盖住「默认」「桌面」。
 */
export function toastBottomOffsetFromClearance(input: {
  viewportHeight: number
  rects: ToastClearanceRect[]
  fallback: number
  gap?: number
}): number {
  const gap = input.gap ?? APP_TOAST_CLEARANCE_GAP
  let top: number | null = null
  for (const rect of input.rects) {
    if (!isDockedClearance(rect, input.viewportHeight)) continue
    if (top == null || rect.top < top) top = rect.top
  }
  if (top == null) return input.fallback
  return Math.max(input.fallback, Math.round(input.viewportHeight - top + gap))
}

export function applyToastBottomCssVar(
  offset: number,
  root: { style: { setProperty: (name: string, value: string) => void } }
): void {
  root.style.setProperty(TOAST_BOTTOM_CSS_VAR, `${offset}px`)
}
