/**
 * 全局 toast 以 Stage 内容区为中线，不要停在整窗几何中心（会被左栏拽偏约半栏宽）。
 */
export function toastContentOffsetLeft(navWidth: number, canvasPad = 12): number {
  return navWidth / 2 + canvasPad
}
