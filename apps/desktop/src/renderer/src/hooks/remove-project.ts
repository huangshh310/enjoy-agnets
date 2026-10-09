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
  /** 剪掉已删项目的历史条目，禁止因此导航。 */
  pruneHistory: (ids: readonly string[]) => void
  /** 切到 SSH next 时只建连，不灌会话。 */
  connectSsh?: (workspace: WorkspaceRow) => Promise<void>
  landEmptyHome?: () => Promise<void>
  clearForegroundChat?: () => void
  notifySwitched?: (workspace: WorkspaceRow) => void
}

/** 先 remove（main 断开），再剪历史（不导航），最后按返回的 lastWorkspaceId 收口指针。 */
export async function runRemoveProject(workspaceId: string, io: RemoveProjectIo) {
  const ids = await io.collectPageIds(workspaceId)
  const wasActive = io.currentWorkspaceId() === workspaceId
  const removed = await io.remove(workspaceId)
  io.unpinIfPinned(workspaceId)
  await io.refreshWorkspaces()
  const remaining = await io.listWorkspaces()
  io.setWorkspacesCache(remaining)
  await io.invalidateCaches()
  io.pruneHistory(ids)
  if (!wasActive) return remaining
  const next = settleWorkspaceAfterRemove(remaining, removed.lastWorkspaceId)
  if (remaining.length === 0) {
    await io.landEmptyHome?.()
    return remaining
  }
  if (next?.kind === "ssh") await io.connectSsh?.(next)
  if (next) {
    io.clearForegroundChat?.()
    io.notifySwitched?.(next)
  }
  return remaining
}
