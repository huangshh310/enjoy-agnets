/**
 * 项目移除与会话归档：刷新侧栏。当前页被拿掉时交给历史栈。
 */
import { getIde, hasIde } from "../lib/ide"
import { queryClient } from "../lib/query-client"
import { useChatStore } from "../stores/chat-store"
import { loadWorkspace, refreshAllWorkspaces } from "./use-agent-session"
import { releaseHistoryPages } from "@renderer/hooks/nav-history/nav-history-controller"
import { historySessionId } from "@renderer/hooks/nav-history/page-ids"
import { collectProjectPageIds } from "@renderer/hooks/nav-history/project-page-ids"

type WorkspaceRow = { id: string; name: string; rootPath: string }

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

/** 移除应用档案中的项目，不删磁盘文件夹。当前页被拿掉时走历史，而不是跳到下一个项目。 */
export async function removeProject(workspaceId: string) {
  if (!hasIde()) return
  const ids = await collectProjectPageIds(workspaceId)
  const store = useChatStore.getState()
  const wasActive = store.workspaceId === workspaceId
  await getIde().workspace.remove({ workspaceId })
  if (store.pinnedWorkspaceIds.includes(workspaceId)) store.togglePinWorkspace(workspaceId)
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
  const removedCurrent = await releaseHistoryPages(ids)
  if (removedCurrent || !wasActive) return
  await restoreAnotherWorkspace(store)
}

async function restoreAnotherWorkspace(store: ReturnType<typeof useChatStore.getState>) {
  const remaining = (await getIde().workspace.list()) as WorkspaceRow[]
  if (remaining[0]) {
    await loadWorkspace(remaining[0])
    return
  }
  store.setWorkspace(null)
}
