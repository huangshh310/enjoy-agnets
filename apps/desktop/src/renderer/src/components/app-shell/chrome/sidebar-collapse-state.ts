/**
 * 侧栏折叠状态机（leo #151）：用户偏好（手动开关，持久化）与窄窗自动收起（只管本次运行）分开存。
 * - 手动开关：改偏好并持久化，清掉自动收起。
 * - 窗口跨进窄窗（< 断点）：偏好是展开时自动收起，不写偏好。
 * - 窗口回到宽窗（≥ 断点）：清掉自动收起，回到偏好。
 * - 重启：偏好从存储读，自动收起按启动时窗宽重新算。
 */
/** 窗宽低于此值算窄窗（440 宽时会话区只剩约 120px）。 */
export const NARROW_SIDEBAR_PX = 600

export type SidebarCollapseState = {
  /** 用户偏好：手动收起过且没再展开。只有它进持久化。 */
  preferred: boolean
  /** 本次运行因窄窗自动收起。 */
  auto: boolean
  /** 上一次看到的窗宽是否窄。 */
  narrow: boolean
}

export function sidebarCollapsed(state: SidebarCollapseState): boolean {
  return state.preferred || state.auto
}

/** 启动：读回偏好，按当前窗宽决定是否自动收起。 */
export function initSidebarCollapse(preferred: boolean, narrow: boolean): SidebarCollapseState {
  return { preferred, auto: narrow && !preferred, narrow }
}

/** 窗宽变化：只在跨断点那一下动；窄窗里手动展开后不会被立刻收回。 */
export function onSidebarWidth(state: SidebarCollapseState, narrow: boolean): SidebarCollapseState {
  if (narrow === state.narrow) return state
  if (narrow) return { ...state, narrow, auto: !state.preferred }
  return { ...state, narrow, auto: false }
}

/** 手动开关：这才是用户偏好。 */
export function onSidebarManual(state: SidebarCollapseState, collapsed: boolean): SidebarCollapseState {
  return { ...state, preferred: collapsed, auto: false }
}

/** 窄窗里侧栏是浮层（不挤主区）：展开且窄窗时才算浮层（luna z151-1）。 */
export function sidebarOverlay(state: SidebarCollapseState): boolean {
  return state.narrow && !sidebarCollapsed(state)
}

/**
 * 窄窗浮层被点外部 / Esc / 选中会话关掉：只是本次收起，不改偏好（luna z151-1）。
 * 回到宽窗时 onSidebarWidth 清掉 auto，回到偏好。
 */
export function onSidebarOverlayDismiss(state: SidebarCollapseState): SidebarCollapseState {
  if (!sidebarOverlay(state)) return state
  return { ...state, auto: true }
}
