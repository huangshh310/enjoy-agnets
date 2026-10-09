/**
 * 重启打断补跑：自动化行也要带 lastRunErrorCode，列表才能读到。
 */
import { CATCH_UP_INTERRUPTED_BY_RESTART } from "@enjoy-agents/ipc-contract/automations-missed"
import { patchStoredAutomation } from "./automations-store"

export function stampInterruptedAutomation(automationId: string): void {
  patchStoredAutomation(automationId, {
    lastRunStatus: "failed",
    lastRunCatchUp: true,
    lastRunErrorCode: CATCH_UP_INTERRUPTED_BY_RESTART,
    lastError: CATCH_UP_INTERRUPTED_BY_RESTART
  })
}
