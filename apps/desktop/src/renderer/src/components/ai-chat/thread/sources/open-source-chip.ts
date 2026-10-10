/**
 * 底脚芯片一次点开抽屉。pointerdown 先 preventDefault，避免 Composer 失焦重渲吞掉 click。
 */
export function openSourceChipOnPointer(
  event: { button?: number; preventDefault: () => void; stopPropagation?: () => void },
  open: () => void
): void {
  if (event.button != null && event.button !== 0) return
  event.preventDefault()
  event.stopPropagation?.()
  queueMicrotask(open)
}
