/**
 * 续跑补跑的收尾：与 launchAutomationAgent 同一条 finish。
 */
import { waitForRunSettle } from "./agent-run-state.ts"
import { finishAutomationRun } from "./automations-finish.ts"
import { emitAutomationsChanged } from "./automations-notify.ts"
import { markAutomationIdle, markAutomationRunning } from "./automations-store.ts"

export async function watchCatchUpSettle(
  automationId: string,
  runId: string,
  opts: { scheduledAt?: number }
): Promise<void> {
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
    markAutomationIdle(automationId)
    emitAutomationsChanged("status", automationId)
  }
}
