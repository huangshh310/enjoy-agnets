/**
 * 终端快捷键作用域：画布或查找条都算终端焦点。
 */
export function isTerminalKeyTarget(element: Element | null): boolean {
  if (!(element instanceof Element)) return false
  return Boolean(element.closest(".xterm, [data-terminal-pane]"))
}

export function isTerminalFindHotkey(event: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}): boolean {
  if (event.altKey || event.shiftKey) return false
  if (!event.metaKey && !event.ctrlKey) return false
  return event.key.toLowerCase() === "f"
}
