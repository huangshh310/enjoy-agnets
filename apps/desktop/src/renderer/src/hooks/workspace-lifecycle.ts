/**
 * 项目移除与会话归档：刷新侧栏。
 * 归档当前会话改选相邻项，剪掉历史条目但不 travel（避免跳进设置 / 已归档）。
 */
import { getIde, hasIde } from "../lib/ide"
import { queryClient } from "../lib/query-client"
import { useAttentionStore } from "../stores/attention/attention-store"
import { useChatStore } from "../stores/chat-store"
import { refreshAllWorkspaces } from "./use-agent-session"
import { runRemoveProject, type RemovedWorkspace } from "./remove-project"
import { connectSshIfNeeded } from "./ssh-session-switch"
import { sessionTitleFromStore } from "./archive-session-copy"
import { notifySessionArchived, notifySessionRestored } from "./archive-session-toast"
import { undoArchivedSession } from "./archive-session-undo"
import { restoreUnarchivedSession } from "./restore-unarchived-session"
import { notifySwitchedProject } from "./switched-project-toast"
import { pickAdjacentSessionId, visibleSessionIdsForArchive } from "./adjacent-session"
import { selectPersistedSession } from "./session-lifecycle"
import { landEmptyHome, pruneHistoryPages, releaseHistoryPages } from "@renderer/hooks/nav-history/nav-history-controller"
import { showEmptyHistoryChat } from "@renderer/hooks/nav-history/show-empty-chat"
import { historySessionId } from "@renderer/hooks/nav-history/page-ids"
import { collectProjectPageIds } from "@renderer/hooks/nav-history/project-page-ids"
import type { WorkspaceRow } from "./workspace-row"
import { readDeniedApprovals } from "./session-archive-result"
import { forgetPendingRewinds } from "./rewind-pending"

export async function archiveCurrentSession(sessionId: string) {
  if (!hasIde()) return
  const store = useChatStore.getState()
  const title = sessionTitleFromStore(sessionId, store.repositories)
  const wasCurrent = store.sessionId === sessionId
  const visibleIds = visibleSessionIdsForArchive(
    store.repositories,
    store.sidebarGrouping,
    store.sessionSortOrder,
    sessionId
  )
  const adjacentId = wasCurrent ? pickAdjacentSessionId(visibleIds, sessionId) : null
  const archived = await getIde().session.archive({ sessionId })
  void readDeniedApprovals(archived)
  // gate-167：归档即丢掉该会话的「从这里重来」待放回记录（会话还在归档表，reconcile 不会清）。
  forgetPendingRewinds([sessionId])
  useAttentionStore.getState().clearSession(sessionId)
  useAttentionStore.getState().takePark(sessionId)
  if (wasCurrent) await landAfterArchive(adjacentId)
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
  pruneHistoryPages([historySessionId(sessionId)])
  notifySessionArchived(sessionId, title, () => void undoArchivedSession(sessionId, wasCurrent))
}

async function landAfterArchive(adjacentId: string | null) {
  if (adjacentId) {
    await selectPersistedSession(adjacentId)
    return
  }
  await landEmptyHome()
}

export async function unarchiveSession(sessionId: string) {
  if (!hasIde()) return
  await restoreUnarchivedSession(sessionId)
  notifySessionRestored()
}

export async function deleteArchivedSession(sessionId: string) {
  if (!hasIde()) return
  await getIde().session.delete({ sessionId })
  // leo r7 S3：删了会话，它的「从这里重来」待放回记录一起删，不然 pagehide 会给已删的会话写孤儿草稿。
  forgetPendingRewinds([sessionId])
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
  await releaseHistoryPages([historySessionId(sessionId)])
}

export async function deleteAllArchivedSessions() {
  if (!hasIde()) return
  const rows = (await getIde().session.listArchived()) as Array<{ id: string }>
  await getIde().session.deleteArchived()
  forgetPendingRewinds(rows.map((row) => row.id))
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
  await releaseHistoryPages(rows.map((row) => historySessionId(row.id)))
}

/** 移除应用档案中的项目，不删磁盘文件夹。剪历史；当前条目被剪时落到 fallback。指针按剩余名单收口。 */
export async function removeProject(workspaceId: string) {
  if (!hasIde()) return
  await runRemoveProject(workspaceId, {
    currentWorkspaceId: () => useChatStore.getState().workspaceId,
    unpinIfPinned: (id) => {
      const store = useChatStore.getState()
      if (store.pinnedWorkspaceIds.includes(id)) store.togglePinWorkspace(id)
    },
    remove: async (id) => {
      // main 移除项目时连它的会话（含已归档的）一起删：先记下这些会话，删完把它们的待放回记录也删掉（leo r7 S3）。
      const sessionIds = await sessionIdsOfWorkspace(id)
      const removed = (await getIde().workspace.remove({ workspaceId: id })) as RemovedWorkspace
      forgetPendingRewinds(sessionIds)
      return removed
    },
    refreshWorkspaces: refreshAllWorkspaces,
    listWorkspaces: async () => (await getIde().workspace.list()) as WorkspaceRow[],
    setWorkspacesCache: (rows) => {
      queryClient.setQueryData(["workspaces"], rows)
    },
    invalidateCaches: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
    },
    collectPageIds: collectProjectPageIds,
    pruneHistory: pruneHistoryPages,
    connectSsh: connectSshIfNeeded,
    landEmptyHome,
    clearForegroundChat: showEmptyHistoryChat,
    notifySwitched: notifySwitchedProject
  })
}

/** 这个项目下的会话 id：侧栏里的 + 已归档的（列归档失败就只用侧栏的）。 */
async function sessionIdsOfWorkspace(workspaceId: string): Promise<string[]> {
  const ids = useChatStore
    .getState()
    .repositories.filter(
      (node) =>
        node.kind === "session" &&
        ((node as { workspaceId?: string }).workspaceId ?? (node as { parentId?: string }).parentId) === workspaceId
    )
    .map((node) => node.id)
  try {
    const archived = (await getIde().session.listArchived()) as Array<{ id: string; workspaceId?: string }>
    for (const row of archived) if (row.workspaceId === workspaceId) ids.push(row.id)
  } catch {
    // 侧栏的照删
  }
  return ids
}
