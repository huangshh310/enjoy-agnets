/**
 * 恢复归档：和 toast 撤销同一条 IPC + 刷新顺序。
 * 已归档页不得另走一条会 bump / 漏刷 workspaces 的路径，否则会跳到顶。
 */
import { getIde, hasIde } from "../lib/ide"
import { queryClient } from "../lib/query-client"
import { refreshAllWorkspaces } from "./refresh-workspaces"

export async function restoreUnarchivedSession(sessionId: string): Promise<void> {
  if (!hasIde()) throw new Error("Enjoy Agents IPC bridge is not available.")
  await getIde().session.unarchive({ sessionId })
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
  await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
}
