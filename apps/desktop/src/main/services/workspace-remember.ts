/**
 * 把工作区使用记进 settings。测试走 workspace-mru 的同一套写入。
 */
import { getSetting, setSetting } from "./database.ts"
import { nextWorkspaceIdAfterRemove, rememberWorkspaceUse } from "./workspace-mru.ts"

function settingsStore() {
  return { get: getSetting, set: setSetting }
}

export function rememberWorkspaceOpened(workspaceId: string): void {
  rememberWorkspaceUse(workspaceId, settingsStore())
}

export function pickWorkspaceAfterRemoveInMain(
  removedId: string,
  remainingIds: readonly string[]
): string | null {
  return nextWorkspaceIdAfterRemove(removedId, remainingIds, settingsStore())
}
