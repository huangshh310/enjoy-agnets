/**
 * 补跑停 Dock 超时：仍有待审批才自动拒绝并失败。
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

export type CatchUpFailPump = (runId: string, run: ActiveRun, error: unknown) => Promise<void>

let testFailPump: CatchUpFailPump | undefined

export function setCatchUpFailPumpForTests(fn?: CatchUpFailPump): void {
  testFailPump = fn
}

export function armCatchUpApprovalTimeout(
  runId: string,
  timeoutMs = CATCH_UP_APPROVAL_TIMEOUT_MS
): void {
  armTimer(runId, (id) => {
    void expireCatchUpApproval(id)
  }, timeoutMs)
}

const testRuns = new Map<string, ActiveRun>()

export function installCatchUpRunForTests(runId: string, run: ActiveRun): void {
  testRuns.set(runId, run)
}

export function uninstallCatchUpRunForTests(runId: string): void {
  testRuns.delete(runId)
}

async function lookupCatchUpRun(runId: string): Promise<ActiveRun | undefined> {
  if (testRuns.has(runId)) return testRuns.get(runId)
  const { getActiveRun } = await import("./agent-run-state.ts")
  return getActiveRun(runId)
}

export async function expireCatchUpApproval(
  runId: string,
  fail?: CatchUpFailPump
): Promise<void> {
  clearCatchUpApprovalTimeout(runId)
  const run = await lookupCatchUpRun(runId)
  if (!run || !isCatchUpRun(run.input)) return
  if (run.pendingApprovals.length === 0) return
  await denyCatchUpPending(run, runId)
  const error = Object.assign(new Error(CATCH_UP_APPROVAL_TIMEOUT), {
    code: CATCH_UP_APPROVAL_TIMEOUT
  })
  await (fail ?? testFailPump ?? defaultCatchUpFail)(runId, run, error)
}

async function denyCatchUpPending(run: ActiveRun, runId: string): Promise<void> {
  const pending = run.pendingApprovals
  run.pendingApprovals = []
  for (const item of pending) {
    run.approvalGate.resolve(item.approvalId, "deny")
    if (run.window.isDestroyed()) continue
    try {
      const { emitEvent } = await import("./agent-run-state.ts")
      emitEvent(run.window, {
        type: "approval.resolved",
        runId,
        toolCallId: item.toolCallId,
        decision: "deny"
      })
    } catch {
      // 已毁窗：闸已 resolve，收尾不依赖推送。
    }
  }
}

async function defaultCatchUpFail(runId: string, run: ActiveRun, error: unknown): Promise<void> {
  const { failAgentPump } = await import("./fail-agent-pump.ts")
  await failAgentPump(runId, run, error)
}

export function isCatchUpRun(input: { automationSource?: { isCatchUp?: boolean } }): boolean {
  return input.automationSource?.isCatchUp === true
}

export function isCatchUpApprovalTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const row = error as { code?: unknown; message?: unknown }
  return row.code === CATCH_UP_APPROVAL_TIMEOUT || row.message === CATCH_UP_APPROVAL_TIMEOUT
}
