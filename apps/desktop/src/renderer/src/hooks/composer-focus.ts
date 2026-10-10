/**
 * Composer 输入框焦点。编辑排队项 / 回填引导词后把光标放到末尾。
 */
type FocusFn = () => void

let focusFn: FocusFn | null = null

export function registerComposerFocus(fn: FocusFn) {
  focusFn = fn
  return () => {
    if (focusFn === fn) focusFn = null
  }
}

export function focusComposerEnd() {
  scheduleFocus(() => focusFn?.())
}

/** 点「新对话」后从按钮挪走焦点，再聚焦输入框。 */
export function focusComposerAfterNewSession() {
  if (typeof document !== "undefined") {
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
  }
  scheduleFocus(() => focusFn?.())
}

function scheduleFocus(fn: () => void) {
  const raf = globalThis.requestAnimationFrame
  if (typeof raf !== "function") {
    fn()
    return
  }
  raf(() => {
    raf(fn)
  })
}
