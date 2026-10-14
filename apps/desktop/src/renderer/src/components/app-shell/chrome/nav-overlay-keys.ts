/**
 * 窄窗侧栏浮层的键盘 / 点击判定（纯函数，便于行为测试；luna / leo #154）。
 */
export type OverlayKeyAction = "dismiss" | "wrap-first" | "wrap-last" | "none"

/**
 * - Esc：焦点在浮层内，或页面上没有任何元素聚焦（body）时关；焦点在别处（弹窗、菜单走 portal）不抢。
 * - Tab：在首 / 尾项上循环，不出浮层。
 */
export function overlayKeyAction(input: {
  key: string
  shiftKey: boolean
  defaultPrevented: boolean
  focusInside: boolean
  nothingFocused: boolean
  atFirst: boolean
  atLast: boolean
}): OverlayKeyAction {
  if (input.key === "Escape") {
    if (input.defaultPrevented) return "none"
    return input.focusInside || input.nothingFocused ? "dismiss" : "none"
  }
  if (input.key !== "Tab" || !input.focusInside) return "none"
  if (input.shiftKey && input.atFirst) return "wrap-last"
  if (!input.shiftKey && input.atLast) return "wrap-first"
  return "none"
}

/** 点的是会话行（不是行菜单）：等行自己的 onClick 跑完（导航已发出）再关浮层。 */
export function overlayClickClosesAfterSelect(target: { closest: (sel: string) => unknown } | null): boolean {
  if (!target) return false
  if (target.closest('[data-testid="session-row-menu"]')) return false
  return Boolean(target.closest('[data-testid="sidebar-session-row"]'))
}

/** 路由或会话变了且浮层开着：关（看板、自动化、轨道、会话行……所有导航入口统一走这里）。 */
export function overlayClosesOnNavigation(prev: string, next: string, overlay: boolean): boolean {
  return overlay && prev !== next
}

/**
 * 导航监视：记住上一次的「路由|会话」，变了且浮层开着就关（leo #154 S5，供组件和行为测试共用）。
 */
export function createOverlayNavWatcher(initial: string, dismiss: () => void) {
  let last = initial
  return (navKey: string, overlay: boolean) => {
    const prev = last
    last = navKey
    if (overlayClosesOnNavigation(prev, navKey, overlay)) dismiss()
  }
}
