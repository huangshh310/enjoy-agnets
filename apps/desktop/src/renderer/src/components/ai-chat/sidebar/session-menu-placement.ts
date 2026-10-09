/**
 * 会话行「…」菜单贴边：靠底时向上对齐，高度不超过可用视口（避开标题栏）。
 */
export const SESSION_MENU_COLLISION = {
  top: 44,
  right: 12,
  bottom: 12,
  left: 12
} as const

export type SessionMenuAlign = "start" | "end"

export type SessionMenuBox = {
  top: number
  bottom: number
}

export function sessionMenuAlign(
  trigger: SessionMenuBox,
  viewportHeight: number,
  padding = SESSION_MENU_COLLISION
): SessionMenuAlign {
  const spaceBelow = viewportHeight - padding.bottom - trigger.top
  const spaceAbove = trigger.bottom - padding.top
  return spaceAbove > spaceBelow ? "end" : "start"
}

export function sessionMenuMaxHeight(
  trigger: SessionMenuBox,
  viewportHeight: number,
  padding = SESSION_MENU_COLLISION,
  align: SessionMenuAlign = sessionMenuAlign(trigger, viewportHeight, padding)
): number {
  const available =
    align === "end" ? trigger.bottom - padding.top : viewportHeight - padding.bottom - trigger.top
  return Math.max(96, Math.floor(available))
}

/** 指针打开后 Esc 回焦：拦住 Radix 默认回焦，并打标记以便 CSS 压掉可见环。 */
export function applySessionMenuCloseFocus(
  event: { preventDefault: () => void },
  openedByPointer: boolean,
  trigger: (HTMLElement & { focus: (options?: FocusOptions) => void }) | null
): void {
  if (!openedByPointer) return
  event.preventDefault()
  if (!trigger) return
  trigger.dataset.pointerReturn = ""
  trigger.focus({ preventScroll: true })
}
