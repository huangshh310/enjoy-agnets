/**
 * 指针打开抽屉后 Esc 回焦：打 pointer-return，只留 focus-visible 环。
 */

let lastPointerTrigger: HTMLButtonElement | null = null

export function markAutomationRowPointer(el: HTMLButtonElement | null): void {
  if (!el) return
  lastPointerTrigger = el
  el.dataset.pointerReturn = ""
}

export function clearAutomationRowPointerMark(): void {
  lastPointerTrigger = null
}

export function applyAutomationDrawerCloseFocus(): void {
  const trigger = lastPointerTrigger
  if (!trigger) return
  trigger.dataset.pointerReturn = ""
  trigger.focus({ preventScroll: true })
}
