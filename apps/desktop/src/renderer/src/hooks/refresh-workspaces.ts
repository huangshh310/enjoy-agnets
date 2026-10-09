/**
 * 全量灌入侧栏项目树。重叠刷新只认最后一次，避免创建后被旧 list 快照盖掉。
 */
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
import type { WorkspaceRow } from "./workspace-row"

type SessionRow = {
  id: string
  workspaceId: string
  title: string
  updatedAt: number
}

let refreshGeneration = 0

export async function refreshAllWorkspaces() {
  if (!hasIde()) return
  const generation = ++refreshGeneration
  try {
    const items = await collectWorkspaceHydrateItems()
    if (generation !== refreshGeneration) return
    const activeWorkspaceId = useChatStore.getState().workspaceId
    useChatStore.getState().hydrateWorkspacesAndSessions(items, activeWorkspaceId)
  } catch {
    // ignore refresh errors
  }
}

async function collectWorkspaceHydrateItems() {
  const workspaces = (await getIde().workspace.list()) as WorkspaceRow[]
  return Promise.all(workspaces.map((workspace) => hydrateOneWorkspace(workspace)))
}

async function hydrateOneWorkspace(workspace: WorkspaceRow) {
  const row = {
    id: workspace.id,
    name: workspace.name,
    rootPath: workspace.rootPath,
    kind: workspace.kind,
    sshStatus: workspace.sshStatus,
    sshHost: workspace.sshHost,
    sshUser: workspace.sshUser,
    remotePath: workspace.remotePath
  }
  try {
    const sessions = (await getIde().session.list({ workspaceId: workspace.id })) as SessionRow[]
    return {
      workspace: row,
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        workspaceId: session.workspaceId
      }))
    }
  } catch {
    return { workspace: row, sessions: [] }
  }
}
