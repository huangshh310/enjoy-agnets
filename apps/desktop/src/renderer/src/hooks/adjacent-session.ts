/**
 * 归档当前会话后的落点：同一可见名单里下一条，否则上一条。
 * 不要走历史栈 past（会跳进设置 / 已归档）。
 */
import {
  orphanSessions,
  sessionsForWorkspace,
  workspaceIdsOf
} from "../components/ai-chat/sidebar/project-session-groups.ts"
import { sortSessions } from "../components/ai-chat/sidebar/sort-sessions.ts"
import type { RepositoryNode } from "../stores/chat-store.types.ts"

export type ArchiveGrouping = "project" | "flat" | "status"
export type ArchiveSortOrder = "priority" | "updated" | "manual"

export function pickAdjacentSessionId(
  visibleIds: readonly string[],
  archivedId: string
): string | null {
  const index = visibleIds.indexOf(archivedId)
  if (index < 0) return visibleIds[0] ?? null
  return visibleIds[index + 1] ?? visibleIds[index - 1] ?? null
}

export function visibleSessionIdsForArchive(
  repositories: readonly RepositoryNode[],
  grouping: ArchiveGrouping,
  sortOrder: ArchiveSortOrder,
  archivedId: string
): string[] {
  const sessions = sortSessions(
    repositories.filter((node) => node.kind === "session"),
    { sortOrder }
  )
  if (grouping === "flat") return sessions.map((session) => session.id)

  if (grouping === "status") {
    const archived = sessions.find((session) => session.id === archivedId)
    const status = archived?.workflowStatus ?? null
    const flagged = Boolean(archived?.flagged)
    return sessions
      .filter((session) => Boolean(session.flagged) === flagged && (session.workflowStatus ?? null) === status)
      .map((session) => session.id)
  }

  const archived = sessions.find((session) => session.id === archivedId)
  const workspaceId = archived?.parentId
  if (workspaceId) {
    return sortProjectSessions(sessionsForWorkspace(sessions, workspaceId)).map((session) => session.id)
  }
  return sortProjectSessions(orphanSessions(sessions, workspaceIdsOf([...repositories]))).map((session) => session.id)
}

function sortProjectSessions(sessions: RepositoryNode[]): RepositoryNode[] {
  return [...sessions].sort((left, right) => {
    const leftFlag = left.flagged ? 1 : 0
    const rightFlag = right.flagged ? 1 : 0
    if (leftFlag !== rightFlag) return rightFlag - leftFlag
    return right.updatedAt - left.updatedAt
  })
}
