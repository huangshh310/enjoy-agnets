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
  focusFn?.()
}
