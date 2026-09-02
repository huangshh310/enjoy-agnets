/**
 * 指针是否在悬停（非触摸、未按下）。enter 用这个；leave 必须配对 useHoverGesture。
 */
export function isHoveringPointer(event: { pointerType: string; buttons: number }) {
  return event.pointerType !== "touch" && event.buttons === 0
}
