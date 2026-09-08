/**
 * Inspector 展开尺寸。
 * react-resizable-panels 的 expand() 回到 collapse 前的百分比；
 * 默认收起时上次是 0，库会写成 1%，看起来像点了没开。
 *
 * Stage 禁止收到 0：最大化审查栏只把工作台压到 42%，切模块再拉回 62%。
 */

export const INSPECTOR_DEFAULT_SIZE = "38%"
export const INSPECTOR_MIN_PX = 280
export const STAGE_DEFAULT_PERCENT = 62
export const INSPECTOR_DEFAULT_PERCENT = 38
export const STAGE_DEFAULT_SIZE = `${STAGE_DEFAULT_PERCENT}%`
export const STAGE_WHEN_INSPECTOR_WIDE = "42%"
export const STAGE_MIN_PERCENT = 25
export const STAGE_TINY_PX = 80

/** 展开后宽度仍小于最小栏宽时，强制拉回默认 38%。 */
export function needsInspectorDefaultSize(sizePx: number): boolean {
  return sizePx < INSPECTOR_MIN_PX
}

/** localStorage 里若把 chat 存成 0/1%，下次启动会只剩审查栏。 */
export function sanitizeSplitLayout(
  layout: Record<string, number>
): Record<string, number> {
  const chat = layout.chat
  if (typeof chat === "number" && chat < STAGE_MIN_PERCENT) {
    return { ...layout, chat: STAGE_DEFAULT_PERCENT, changes: INSPECTOR_DEFAULT_PERCENT }
  }
  return layout
}
