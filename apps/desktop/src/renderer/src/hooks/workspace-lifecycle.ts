/**
 * 项目移除与会话归档：刷新侧栏。当前页被拿掉时交给历史栈。
 */
import { getIde, hasIde } from "../lib/ide"
import { queryClient } from "../lib/query-client"
import { useChatStore } from "../stores/chat-store"
import { refreshAllWorkspaces } from "./use-agent-session"
import { runRemoveProject, type RemovedWorkspace } from "./remove-project"
import { connectSshIfNeeded } from "./ssh-session-switch"
import { notifySwitchedProject } from "./switched-project-toast"
import { landEmptyHome, pruneHistoryPages, releaseHistoryPages } from "@renderer/hooks/nav-history/nav-history-controller"
import { showEmptyHistoryChat } from "@renderer/hooks/nav-history/show-empty-chat"
import { historySessionId } from "@renderer/hooks/nav-history/page-ids"
import { collectProjectPageIds } from "@renderer/hooks/nav-history/project-page-ids"
import type { WorkspaceRow } from "./workspace-row"

export async function archiveCurrentSession(sessionId: string) {
  if (!hasIde()) return
  await getIde().session.archive({ sessionId })
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  await releaseHistoryPages([historySessionId(sessionId)])
}

export async function unarchiveSession(sessionId: string) {
  if (!hasIde()) return
  await getIde().session.unarchive({ sessionId })
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
}

export async function deleteArchivedSession(sessionId: string) {
  if (!hasIde()) return
  await getIde().session.delete({ sessionId })
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
  await releaseHistoryPages([historySessionId(sessionId)])
}

export async function deleteAllArchivedSessions() {
  if (!hasIde()) return
  const rows = (await getIde().session.listArchived()) as Array<{ id: string }>
  await getIde().session.deleteArchived()
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
  await releaseHistoryPages(rows.map((row) => historySessionId(row.id)))
}

/** 移除应用档案中的项目，不删磁盘文件夹。剪掉该项目历史条目但不导航，指针按剩余名单收口。 */
export async function removeProject(workspaceId: string) {
  if (!hasIde()) return
  await runRemoveProject(workspaceId, {
    currentWorkspaceId: () => useChatStore.getState().workspaceId,
    unpinIfPinned: (id) => {
      const store = useChatStore.getState()
      if (store.pinnedWorkspaceIds.includes(id)) store.togglePinWorkspace(id)
    },
    remove: async (id) =>
      (await getIde().workspace.remove({ workspaceId: id })) as RemovedWorkspace,
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
