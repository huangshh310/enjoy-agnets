/**
 * 删除项目的可测编排：main 已负责断 SSH；这里只刷新侧栏并收口指针。
 * 路由回落只切指针，禁止再灌会话或往库里写空对话。
 */
import { settleWorkspaceAfterRemove } from "./workspace-pointer.ts"
import type { WorkspaceRow } from "./workspace-row.ts"

export type RemovedWorkspace = {
  id: string
  lastWorkspaceId?: string | null
}

export type RemoveProjectIo = {
  currentWorkspaceId: () => string | null
  unpinIfPinned: (workspaceId: string) => void
  remove: (workspaceId: string) => Promise<RemovedWorkspace>
  refreshWorkspaces: () => Promise<void>
  listWorkspaces: () => Promise<WorkspaceRow[]>
  setWorkspacesCache: (rows: WorkspaceRow[]) => void
  invalidateCaches: () => Promise<void>
  collectPageIds: (workspaceId: string) => Promise<string[]>
  releaseHistory: (ids: readonly string[]) => Promise<boolean>
  /** 切到 SSH next 时只建连，不灌会话。 */
  connectSsh?: (workspace: WorkspaceRow) => Promise<void>
  landEmptyHome?: () => Promise<void>
  notifySwitched?: (workspace: WorkspaceRow) => void
}

/** 先 remove（main 断开），再历史回落，最后按返回的 lastWorkspaceId 收口指针。 */
export async function runRemoveProject(workspaceId: string, io: RemoveProjectIo) {
  const ids = await io.collectPageIds(workspaceId)
  const wasActive = io.currentWorkspaceId() === workspaceId
  const removed = await io.remove(workspaceId)
  io.unpinIfPinned(workspaceId)
  await io.refreshWorkspaces()
  const remaining = await io.listWorkspaces()
  io.setWorkspacesCache(remaining)
  await io.invalidateCaches()
  const removedCurrent = await io.releaseHistory(ids)
  if (!wasActive && !removedCurrent) return remaining
  const next = settleWorkspaceAfterRemove(remaining, removed.lastWorkspaceId)
  if (remaining.length === 0) {
    await io.landEmptyHome?.()
    return remaining
  }
  if (next?.kind === "ssh") await io.connectSsh?.(next)
  if (next) io.notifySwitched?.(next)
  return remaining
}
