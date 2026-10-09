/**
 * 补跑停 Dock 超时：自动拒绝并失败，不新开跳过原因。
 */
import {
  CATCH_UP_APPROVAL_TIMEOUT,
  CATCH_UP_APPROVAL_TIMEOUT_MS
} from "@enjoy-agents/ipc-contract/automations-missed"
import { failAgentPump } from "./fail-agent-pump.ts"
import { emitEvent, getActiveRun } from "./agent-run-state.ts"
import {
  armCatchUpApprovalTimeout as armTimer,
  catchUpApprovalTimedOut,
  clearCatchUpApprovalTimeout
} from "./automations-catchup-timer.ts"

export { catchUpApprovalTimedOut }

export function armCatchUpApprovalTimeout(
  runId: string,
  timeoutMs = CATCH_UP_APPROVAL_TIMEOUT_MS
): void {
  armTimer(runId, (id) => {
    void expireCatchUpApproval(id)
  }, timeoutMs)
}

export { clearCatchUpApprovalTimeout }

export async function expireCatchUpApproval(runId: string): Promise<void> {
  clearCatchUpApprovalTimeout(runId)
  const run = getActiveRun(runId)
  if (!run?.input.automationSource?.isCatchUp) return
  for (const pending of [...run.pendingApprovals]) {
    run.approvalGate.resolve(pending.approvalId, "deny")
    emitEvent(run.window, {
      type: "approval.resolved",
      runId,
      toolCallId: pending.toolCallId,
      decision: "deny"
    })
  }
  run.pendingApprovals = []
  const error = Object.assign(new Error(CATCH_UP_APPROVAL_TIMEOUT), {
    code: CATCH_UP_APPROVAL_TIMEOUT
  })
  await failAgentPump(runId, run, error)
}

export function isCatchUpRun(input: { automationSource?: { isCatchUp?: boolean } }): boolean {
  return input.automationSource?.isCatchUp === true
}
