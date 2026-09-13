/**
 * 把工作区 / 会话列表折成侧栏 RepositoryNode。
 * 首次灌入才默认展开当前工作区，之后尊重用户收起。
 */
import type { RepositoryNode, WorkspaceSessionHydrate } from "./chat-store.types"

export function buildWorkspaceTree(
  items: WorkspaceSessionHydrate[],
  pinnedWorkspaceIds: string[],
  expandedIds: string[],
  hadRepos: boolean,
  activeWorkspaceId?: string | null
): { repositories: RepositoryNode[]; expandedIds: string[] } {
  const liveIds = new Set(items.map((item) => item.workspace.id))
  const expanded = expandedIds.filter((id) => liveIds.has(id))
  if (
    !hadRepos &&
    activeWorkspaceId &&
    liveIds.has(activeWorkspaceId) &&
    !expanded.includes(activeWorkspaceId)
  ) {
    expanded.push(activeWorkspaceId)
  }

  const repositories: RepositoryNode[] = []
  for (const item of items) {
    repositories.push({
      id: item.workspace.id,
      name: item.workspace.name,
      kind: "workspace",
      updatedAt: Date.now(),
      rootPath: item.workspace.rootPath,
      locationKind: item.workspace.kind === "ssh" ? "ssh" : "local",
      sshStatus: item.workspace.sshStatus,
      sshHost: item.workspace.sshHost,
      sshUser: item.workspace.sshUser,
      remotePath: item.workspace.remotePath,
      isPinned: pinnedWorkspaceIds.includes(item.workspace.id)
    })
    for (const session of item.sessions) {
      repositories.push({
        id: session.id,
        name: session.title,
        kind: "session",
        parentId: item.workspace.id,
        updatedAt: session.updatedAt,
        workspaceId: session.workspaceId,
        flagged: session.flagged,
        workflowStatus: session.workflowStatus,
        goal: session.goal,
        recap: session.recap
      })
    }
  }
  return { repositories, expandedIds: expanded }
}

export function buildSessionTree(
  workspace: { id: string; name: string },
  sessions: Array<{
    id: string
    title: string
    updatedAt: number
    workspaceId: string
    flagged?: boolean
    workflowStatus?: RepositoryNode["workflowStatus"]
    goal?: string | null
    recap?: string | null
  }>
): RepositoryNode[] {
  return [
    {
      id: workspace.id,
      name: workspace.name,
      kind: "workspace",
      updatedAt: Date.now()
    },
    ...sessions.map((session) => ({
      id: session.id,
      name: session.title,
      kind: "session" as const,
      parentId: workspace.id,
      updatedAt: session.updatedAt,
      workspaceId: session.workspaceId,
      flagged: session.flagged,
      workflowStatus: session.workflowStatus,
      goal: session.goal,
      recap: session.recap
    }))
  ]
}
