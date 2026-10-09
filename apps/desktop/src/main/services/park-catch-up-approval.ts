/**
 * 补跑审批停车：主循环 persistWaiting、子 Agent、二次确认共用计时器。
 */
import type { PendingApproval } from "./consume-stream"
import { toSubagentUserDecision, type ApprovalUserDecision } from "./approval-gate.ts"
import type { ActiveRun } from "./agent-run-state"
import { armCatchUpApprovalTimeout, isCatchUpRun } from "./automations-catchup-timeout.ts"

export function armCatchUpPark(run: ActiveRun, runId: string): void {
  if (!isCatchUpRun(run.input)) return
  armCatchUpApprovalTimeout(runId)
}

export function waitParkedCatchUpApproval(
  run: ActiveRun,
  runId: string,
  pending: PendingApproval
): Promise<ApprovalUserDecision> {
  run.pendingApprovals.push(pending)
  armCatchUpPark(run, runId)
  return run.approvalGate.wait(pending.approvalId)
}

export function beginSubagentCatchUpWait(
  run: ActiveRun,
  runId: string,
  pending: PendingApproval
): Promise<"allow" | "deny" | "allow_session"> {
  return waitParkedCatchUpApproval(run, runId, pending).then(toSubagentUserDecision)
}

export function beginSecondConfirmCatchUpWait(
  run: ActiveRun,
  runId: string,
  pending: Omit<PendingApproval, "name"> & { name?: string }
): Promise<ApprovalUserDecision> {
  return waitParkedCatchUpApproval(run, runId, { ...pending, name: "desktop_act" })
}
