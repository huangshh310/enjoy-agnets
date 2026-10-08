/**
 * 页面稳定 id。会话、项目、路由各有前缀，避免撞号。
 */
import { DEFAULT_HISTORY_ID } from "./constants.ts"

export function historySessionId(sessionId: string): string {
  return `session:${sessionId}`
}

export function historyWorkspaceId(workspaceId: string): string {
  return `workspace:${workspaceId}`
}

export function historyIdsForProject(workspaceId: string, sessionIds: readonly string[]): string[] {
  const ids = new Set<string>([historyWorkspaceId(workspaceId)])
  for (const sessionId of sessionIds) ids.add(historySessionId(sessionId))
  return [...ids]
}

export function isDefaultHistoryId(id: string): boolean {
  return id === DEFAULT_HISTORY_ID
}
