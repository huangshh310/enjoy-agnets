/**
 * 右栏只在对话线程出现；设置 / 看板 / 自动化要让出宽度。
 */
export function isConversationSurface(isChat: boolean, pathname: string): boolean {
  if (!isChat) return false
  return pathname !== "/kanban" && pathname !== "/automations"
}
