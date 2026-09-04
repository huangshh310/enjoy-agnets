/**
 * Inspector 展开尺寸。
 * react-resizable-panels 的 expand() 回到 collapse 前的百分比；
 * 默认收起时上次是 0，库会写成 1%，看起来像点了没开。
 */

export const INSPECTOR_DEFAULT_SIZE = "38%"
export const INSPECTOR_MIN_PX = 280

/** 展开后宽度仍小于最小栏宽时，强制拉回默认 38%。 */
export function needsInspectorDefaultSize(sizePx: number): boolean {
  return sizePx < INSPECTOR_MIN_PX
}
