/**
 * toast「撤销」：等待 session.unarchive，失败给人话和已归档入口。
 * 禁止 void 掉 Promise，否则 IPC / Zod 失败时 toast 已关、侧栏也不回来。
 */
import { selectPersistedSession } from "./session-lifecycle"
import { notifyUndoArchiveFailed, notifySessionRestored } from "./archive-session-toast"
import { getIde, hasIde } from "../lib/ide"
import { queryClient } from "../lib/query-client"
import { refreshAllWorkspaces } from "./refresh-workspaces"

export async function undoArchivedSession(sessionId: string, reselect: boolean): Promise<boolean> {
  try {
    if (!hasIde()) throw new Error("Enjoy Agents IPC bridge is not available.")
    await getIde().session.unarchive({ sessionId })
    await refreshAllWorkspaces()
    await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
    await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    notifySessionRestored()
    if (reselect) await selectPersistedSession(sessionId)
    return true
  } catch {
    notifyUndoArchiveFailed()
    return false
  }
}
