/**
 * 续跑补跑的收尾：与 launchAutomationAgent 同一条 finish。
 */
import { waitForRunSettle } from "./agent-run-state.ts"
import { finishAutomationRun } from "./automations-finish.ts"
import { emitAutomationsChanged } from "./automations-notify.ts"
import { markAutomationIdle, markAutomationRunning } from "./automations-store.ts"

const watchedRunIds = new Set<string>()

/** 同一 runId 只挂一个 watcher，窗口重建不得再 finish 一次。 */
export function claimCatchUpSettleWatch(runId: string): boolean {
  if (watchedRunIds.has(runId)) return false
  watchedRunIds.add(runId)
  return true
}

export async function watchCatchUpSettle(
  automationId: string,
  runId: string,
  opts: { scheduledAt?: number }
): Promise<void> {
  if (!claimCatchUpSettleWatch(runId)) return
  markAutomationRunning(automationId)
  emitAutomationsChanged("run", automationId)
  try {
    const settled = await waitForRunSettle(runId)
    finishAutomationRun(
      automationId,
      settled.status === "end" ? "ok" : "failed",
      settled.summary,
      { scheduledAt: opts.scheduledAt, isCatchUp: true }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    finishAutomationRun(automationId, "failed", message, {
      scheduledAt: opts.scheduledAt,
      isCatchUp: true
    })
  } finally {
    watchedRunIds.delete(runId)
    markAutomationIdle(automationId)
    emitAutomationsChanged("status", automationId)
  }
}
