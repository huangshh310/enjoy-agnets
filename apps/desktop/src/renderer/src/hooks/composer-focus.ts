/**
 * Composer 输入框焦点。编辑排队项 / 回填引导词后把光标放到末尾。
 * 新对话欢迎页与切会话后自动对焦；用户正在别处打字（搜索 / 对话框 / 设置）时不抢。
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

export function isChatThreadPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/"
  return path === "/" || path === ""
}

export function pathFromLocation(hash: string, pathname = "/"): string {
  const fromHash = hash.replace(/^#/, "").split("?")[0]
  if (fromHash) return fromHash
  return pathname.split("?")[0] || "/"
}

export function shouldClaimComposerFocus(input: {
  pathname: string
  activeIsComposer?: boolean
  activeIsTypingField?: boolean
  activeInDialog?: boolean
}): boolean {
  if (!isChatThreadPath(input.pathname)) return false
  if (input.activeIsComposer) return true
  if (input.activeIsTypingField) return false
  if (input.activeInDialog) return false
  return true
}

export function canClaimComposerFocus(root: Document = document): boolean {
  const active = root.activeElement
  return shouldClaimComposerFocus({
    pathname: pathFromLocation(root.defaultView?.location.hash ?? "", root.defaultView?.location.pathname ?? "/"),
    activeIsComposer: Boolean(active?.closest('[data-testid="composer-input"]')),
    activeIsTypingField: isProtectedTypingTarget(active),
    activeInDialog: Boolean(active?.closest('[role="dialog"], [role="alertdialog"]'))
  })
}

export function queueComposerFocus() {
  const claim = () => {
    if (typeof document === "undefined") return
    if (!canClaimComposerFocus()) return
    focusComposerEnd()
  }
  claim()
  const raf =
    typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn: () => void) => setTimeout(fn, 0)
  raf(() => {
    raf(claim)
  })
}

function isProtectedTypingTarget(active: Element | null): boolean {
  if (!active) return false
  if (active.closest('[data-testid="composer-input"]')) return false
  const tag = active.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  return Boolean((active as HTMLElement).isContentEditable)
}
