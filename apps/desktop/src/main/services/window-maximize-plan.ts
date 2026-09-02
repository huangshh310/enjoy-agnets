/**
 * 透明无边框窗不能只信 OS isMaximized。按工作区 bounds 决定放大 / 还原。
 */

export type Rect = { x: number; y: number; width: number; height: number }

const SLOP = 8

export function isFilledWorkArea(bounds: Rect, workArea: Rect, slop = SLOP): boolean {
  return (
    Math.abs(bounds.x - workArea.x) <= slop &&
    Math.abs(bounds.y - workArea.y) <= slop &&
    Math.abs(bounds.width - workArea.width) <= slop &&
    Math.abs(bounds.height - workArea.height) <= slop
  )
}

export function planMaximizeToggle(input: {
  osMaximized: boolean
  bounds: Rect
  workArea: Rect
  saved?: Rect
}): { action: "maximize" | "restore"; restoreTo?: Rect } {
  const filled = input.osMaximized || isFilledWorkArea(input.bounds, input.workArea)
  if (filled) return { action: "restore", restoreTo: input.saved }
  return { action: "maximize" }
}
