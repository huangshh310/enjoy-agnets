/**
 * 补跑停 Dock 超时：仍有待审批才 abort、自动拒绝并失败。
 */
import {
  CATCH_UP_APPROVAL_TIMEOUT,
  CATCH_UP_APPROVAL_TIMEOUT_MS
} from "@enjoy-agents/ipc-contract/automations-missed"
import type { ActiveRun } from "./agent-run-state.ts"
import {
  armCatchUpApprovalTimeout as armTimer,
  catchUpApprovalTimedOut,
  clearCatchUpApprovalTimeout
} from "./automations-catchup-timer.ts"

export { catchUpApprovalTimedOut, clearCatchUpApprovalTimeout }

export function armCatchUpApprovalTimeout(
  runId: string,
  timeoutMs = CATCH_UP_APPROVAL_TIMEOUT_MS
): void {
  armTimer(runId, (id) => {
    void expireCatchUpApproval(id)
  }, timeoutMs)
}

async function lookupCatchUpRun(runId: string): Promise<ActiveRun | undefined> {
  const { getActiveRun } = await import("./agent-run-state.ts")
  return getActiveRun(runId)
}

export async function expireCatchUpApproval(runId: string): Promise<void> {
  clearCatchUpApprovalTimeout(runId)
  const run = await lookupCatchUpRun(runId)
  if (!run || !isCatchUpRun(run.input)) return
  if (run.pendingApprovals.length === 0) return
  markCatchUpApprovalTimeout(run)
  run.abort.abort()
  denyCatchUpPending(run)
  const error = Object.assign(new Error(CATCH_UP_APPROVAL_TIMEOUT), {
    code: CATCH_UP_APPROVAL_TIMEOUT
  })
  const { failAgentPump } = await import("./fail-agent-pump.ts")
  await failAgentPump(runId, run, error)
}

/** 只放开闸；approval.resolved 留给 failAgentPump settle 发一次，禁止同一工具两条事件。 */
function denyCatchUpPending(run: ActiveRun): void {
  for (const item of run.pendingApprovals) {
    run.approvalGate.resolve(item.approvalId, "deny")
  }
}

export function isCatchUpRun(input: { automationSource?: { isCatchUp?: boolean } }): boolean {
  return input.automationSource?.isCatchUp === true
}

export function markCatchUpApprovalTimeout(run: { catchUpApprovalTimedOut?: boolean }): void {
  run.catchUpApprovalTimedOut = true
}

export function isCatchUpApprovalTimeout(run: { catchUpApprovalTimedOut?: boolean }, error: unknown): boolean {
  return run.catchUpApprovalTimedOut === true || isCatchUpApprovalTimeoutError(error)
}

export function isCatchUpApprovalTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const row = error as { code?: unknown; message?: unknown }
  return row.code === CATCH_UP_APPROVAL_TIMEOUT || row.message === CATCH_UP_APPROVAL_TIMEOUT
}
