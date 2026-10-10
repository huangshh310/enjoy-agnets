/**
 * toast「撤销」：等待 session.unarchive，失败给人话和已归档入口。
 * 禁止 void 掉 Promise，否则 IPC / Zod 失败时 toast 已关、侧栏也不回来。
 */
import { selectPersistedSession } from "./session-lifecycle"
import { notifyUndoArchiveFailed, notifySessionRestored } from "./archive-session-toast"
import { restoreUnarchivedSession } from "./restore-unarchived-session"

export async function undoArchivedSession(sessionId: string, reselect: boolean): Promise<boolean> {
  try {
    await restoreUnarchivedSession(sessionId)
    notifySessionRestored()
    if (reselect) await selectPersistedSession(sessionId)
    return true
  } catch {
    notifyUndoArchiveFailed()
    return false
  }
}
