/**
 * 侧栏项目行展开判定。
 * 只认 expandedIds，不能用「当前工作区」强制展开，否则二次点击无法收缩。
 */

/** 该项目行是否展开。 */
export function isWorkspaceRowExpanded(
  workspaceId: string,
  expandedIds: readonly string[]
): boolean {
  return expandedIds.includes(workspaceId)
}

/**
 * 点击项目行时是否还要切换当前工作区。
 * 仅在「从收起变为展开、且不是当前工作区」时切换；再次点击只收缩。
 */
export function shouldSwitchWorkspaceOnFolderClick(
  workspaceId: string,
  currentWorkspaceId: string | null,
  wasExpanded: boolean
): boolean {
  return !wasExpanded && workspaceId !== currentWorkspaceId
}
