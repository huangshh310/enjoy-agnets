/**
 * 抽屉 Esc：只要没被内部层 preventDefault，就关。
 * 不要因 listbox / 输入框焦点而吞掉关闭。
 */
export function shouldCloseDrawerOnEscape(event: {
  key: string
  defaultPrevented: boolean
}): boolean {
  return event.key === "Escape" && !event.defaultPrevented
}
