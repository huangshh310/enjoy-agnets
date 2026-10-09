/**
 * 补跑审批停车：主循环 persistWaiting、子 Agent、二次确认共用计时器。
 */
import type { ActiveRun } from "./agent-run-state"
import { armCatchUpApprovalTimeout, isCatchUpRun } from "./automations-catchup-timeout.ts"

export function armCatchUpPark(run: ActiveRun, runId: string): void {
  if (!isCatchUpRun(run.input)) return
  armCatchUpApprovalTimeout(runId)
}
