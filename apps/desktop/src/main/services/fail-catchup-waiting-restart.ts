/**
 * 重启时把补跑 waiting_review 收成 interrupted_by_restart。
 */
import { listPendingApprovals, setApprovalDecision, updateRun } from "@enjoy-agents/db"
import { CATCH_UP_INTERRUPTED_BY_RESTART } from "@enjoy-agents/ipc-contract/automations-missed"
import { failCatchUpWaiting } from "./automations-catchup-orphans"
import { stampInterruptedAutomation } from "./automations-interrupt-stamp"
import { defaultSettingsIo } from "./automations-missed-store"
import { getDatabase } from "./database"

export function failCatchUpWaitingOnRestart(runId: string): void {
  const db = getDatabase()
  for (const item of listPendingApprovals(db, runId)) {
    setApprovalDecision(db, item.id, "deny")
  }
  updateRun(db, runId, { status: "failed", error: CATCH_UP_INTERRUPTED_BY_RESTART })
  failCatchUpWaiting(defaultSettingsIo(), runId, Date.now(), stampInterruptedAutomation)
}
