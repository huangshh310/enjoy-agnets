/**
 * 项目被移除时，它自己和名下会话都要从历史里拿掉。
 */
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { historyIdsForProject } from "./page-ids"

export async function collectProjectPageIds(workspaceId: string): Promise<string[]> {
  const live = useChatStore.getState().repositories
    .filter((node) => node.kind === "session" && (node.workspaceId === workspaceId || node.parentId === workspaceId))
    .map((node) => node.id)
  const archived = await archivedSessionIds(workspaceId)
  return historyIdsForProject(workspaceId, [...live, ...archived])
}

async function archivedSessionIds(workspaceId: string): Promise<string[]> {
  try {
    const rows = (await getIde().session.listArchived()) as Array<{ id: string; workspaceId: string }>
    return rows.filter((row) => row.workspaceId === workspaceId).map((row) => row.id)
  } catch {
    return []
  }
}
