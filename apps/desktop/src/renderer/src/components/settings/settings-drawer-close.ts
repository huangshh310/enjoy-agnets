/**
 * 抽屉 Esc 与设置回工位：抽屉先吃掉按键，设置页只在无抽屉时回退。
 */
export const SETTINGS_DRAWER_OPEN_SEL = '[data-settings-drawer="open"]'
export const APP_DIALOG_OPEN_SEL = '[data-slot="dialog-content"]'

export function shouldCloseDrawerOnEscape(event: {
  key: string
  defaultPrevented: boolean
}): boolean {
  return event.key === "Escape" && !event.defaultPrevented
}

export function isAppDialogOpen(
  root: { querySelector: (sel: string) => unknown } | null = typeof document === "undefined" ? null : document
): boolean {
  return Boolean(root?.querySelector(APP_DIALOG_OPEN_SEL))
}

export function markDrawerEscapeHandled(event: {
  preventDefault: () => void
  stopPropagation: () => void
  stopImmediatePropagation: () => void
}): void {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

export function isSettingsDrawerOpen(
  root: { querySelector: (sel: string) => unknown } | null = typeof document === "undefined" ? null : document
): boolean {
  return Boolean(root?.querySelector(SETTINGS_DRAWER_OPEN_SEL))
}

/**
 * 关闭钮用 pointerdown：先 preventDefault 保住这次点，避免输入框失焦重渲把 click 吞掉。
 * 只认主键，不要让右键/中键关抽屉。
 */
export function handleDrawerClosePointer(
  event: { button?: number; preventDefault: () => void },
  onClose: () => void
): void {
  if (event.button != null && event.button !== 0) return
  event.preventDefault()
  onClose()
}

/** 设置 / Inbox 的 Esc 回工位：已处理、或抽屉开着，都不离开。 */
export function shouldLeaveSettingsOnEscape(input: {
  key?: string
  defaultPrevented: boolean
  drawerOpen: boolean
  overlayModule: boolean
}): boolean {
  if (!input.overlayModule) return false
  if (input.key != null && input.key !== "Escape") return false
  if (input.defaultPrevented || input.drawerOpen) return false
  return true
}
