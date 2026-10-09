/**
 * 补跑审批超时器。无业务 import，避免 waiting / fail 循环。
 */
import { CATCH_UP_APPROVAL_TIMEOUT_MS } from "@enjoy-agents/ipc-contract/automations-missed"

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function catchUpApprovalTimedOut(
  parkedAt: number,
  now: number,
  timeoutMs = CATCH_UP_APPROVAL_TIMEOUT_MS
): boolean {
  return now - parkedAt >= timeoutMs
}

export function armCatchUpApprovalTimeout(
  runId: string,
  onExpire: (runId: string) => void,
  timeoutMs = CATCH_UP_APPROVAL_TIMEOUT_MS
): void {
  clearCatchUpApprovalTimeout(runId)
  timers.set(
    runId,
    setTimeout(() => {
      timers.delete(runId)
      onExpire(runId)
    }, timeoutMs)
  )
}

export function clearCatchUpApprovalTimeout(runId: string): void {
  const timer = timers.get(runId)
  if (timer) clearTimeout(timer)
  timers.delete(runId)
}

export function hasCatchUpApprovalTimeout(runId: string): boolean {
  return timers.has(runId)
}
