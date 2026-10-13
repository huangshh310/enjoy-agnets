/**
 * jojo P1：会话最近一次真失败（runs.status=failed + error）。
 * 回灌时用来还原红卡 + 重试；inbox「失败」档案看得到、打开会话却没条，是因为 store.error 只活在内存。
 */
import { listRuns } from "@enjoy-agents/db"
import { isRestoreFamilyCode } from "@enjoy-agents/ipc-contract/restore-codes"
import { CATCH_UP_APPROVAL_TIMEOUT } from "@enjoy-agents/ipc-contract/automations-missed"
import { getDatabase } from "./database"

export type SessionLastError = {
  runId: string
  message: string
  updatedAt: number
}

/** 最近一条失败 run；回挂码 / 补跑超时 / 空文不当红卡。 */
export function sessionLastError(sessionId: string): SessionLastError | null {
  if (!sessionId) return null
  try {
    const runs = listRuns(getDatabase(), { sessionId, kind: "agent" })
    for (const run of runs) {
      if (run.status !== "failed") continue
      const message = typeof run.error === "string" ? run.error.trim() : ""
      if (!message) continue
      if (isRestoreFamilyCode(message)) continue
      if (message === CATCH_UP_APPROVAL_TIMEOUT) continue
      return { runId: run.id, message, updatedAt: run.updatedAt }
    }
  } catch {
    return null
  }
  return null
}
