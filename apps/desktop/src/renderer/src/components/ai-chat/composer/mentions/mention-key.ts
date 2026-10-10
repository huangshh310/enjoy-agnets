/**
 * @ / 面板键盘：方向移动、Escape 关闭、Enter/Tab 选中。
 */

export type MentionKeyAction =
  | { type: "move"; index: number }
  | { type: "dismiss" }
  | { type: "pick"; index: number }
  | { type: "none" }

export function mentionKeyAction(
  key: string,
  open: boolean,
  activeIndex: number,
  count: number,
  composing = false
): MentionKeyAction {
  if (!open) return { type: "none" }
  if (key === "ArrowDown") return { type: "move", index: wrapIndex(activeIndex + 1, count) }
  if (key === "ArrowUp") return { type: "move", index: wrapIndex(activeIndex - 1, count) }
  if (key === "Escape") return { type: "dismiss" }
  if (composing) return { type: "none" }
  if ((key === "Enter" || key === "Tab") && count > 0) {
    return { type: "pick", index: Math.min(activeIndex, count - 1) }
  }
  return { type: "none" }
}

function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}
