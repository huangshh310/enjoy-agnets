/**
 * 跑时是否把 file.changed 跟进到已打开的审查栏。收起时不拉开。
 */
export function shouldFollowFileChanged(input: {
  collapsed: boolean
  activeTabKind?: string | null
  reviewScope: string
}): boolean {
  if (input.collapsed) return false
  if (input.activeTabKind !== "review") return false
  return input.reviewScope === "last-turn"
}
