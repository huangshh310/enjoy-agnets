/**
 * 补跑超时 / failAgentPump 并发时只收尾一次。
 */
const claimed = new Set<string>()

export function claimCatchUpFail(runId: string): boolean {
  if (claimed.has(runId)) return false
  claimed.add(runId)
  return true
}

export function releaseCatchUpFail(runId: string): void {
  claimed.delete(runId)
}
