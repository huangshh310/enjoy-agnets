/**
 * 项目移除与会话归档：刷新侧栏，并在当前项被拿掉时切到下一份。
 */
import { getIde, hasIde } from "../lib/ide"
import { queryClient } from "../lib/query-client"
import { useChatStore } from "../stores/chat-store"
import {
  createAndOpenSession,
  loadSession,
  loadWorkspace,
  refreshAllWorkspaces
} from "./use-agent-session"

type WorkspaceRow = { id: string; name: string; rootPath: string }

export async function archiveCurrentSession(sessionId: string) {
  if (!hasIde()) return
  await getIde().session.archive({ sessionId })
  const store = useChatStore.getState()
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  if (store.sessionId !== sessionId) return
  await openFallbackSession(store.workspaceId)
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
}

export async function deleteAllArchivedSessions() {
  if (!hasIde()) return
  await getIde().session.deleteArchived()
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
}

/** 移除应用档案中的项目，不删磁盘文件夹。 */
export async function removeProject(workspaceId: string) {
  if (!hasIde()) return
  const store = useChatStore.getState()
  const wasCurrent = store.workspaceId === workspaceId
  await getIde().workspace.remove({ workspaceId })
  if (store.pinnedWorkspaceIds.includes(workspaceId)) {
    store.togglePinWorkspace(workspaceId)
  }
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
  if (!wasCurrent) return
  const remaining = (await getIde().workspace.list()) as WorkspaceRow[]
  if (remaining[0]) {
    await loadWorkspace(remaining[0])
    return
  }
  store.setWorkspace(null)
}

async function openFallbackSession(workspaceId: string | null) {
  if (!workspaceId) return
  const sessions = (await getIde().session.list(workspaceId)) as Array<{
    id: string
    title: string
  }>
  if (sessions[0]) {
    await loadSession(sessions[0].id, sessions[0].title)
    return
  }
  await createAndOpenSession(workspaceId, "新对话")
}
