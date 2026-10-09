/**
 * restoreRunningRuns 续上或没续上补跑时的收口。
 */
import { failCatchUpWaiting } from "./automations-catchup-orphans.ts"
import { stampInterruptedAutomation } from "./automations-interrupt-stamp.ts"
import { defaultSettingsIo } from "./automations-missed-store.ts"
import { markAutomationIdle, markAutomationRunning } from "./automations-store.ts"
import { catchUpSourceOf } from "./catch-up-source.ts"
import { watchCatchUpSettle } from "./watch-catchup-settle.ts"

export function markRestoredCatchUpRunning(source: unknown): void {
  const opts = catchUpSourceOf(source)
  if (!opts) return
  markAutomationRunning(opts.automationId)
}

export function markRestoredCatchUpIdle(source: unknown): void {
  const opts = catchUpSourceOf(source)
  if (!opts) return
  markAutomationIdle(opts.automationId)
}

export function attachRestoredCatchUp(runId: string, source: unknown): void {
  const opts = catchUpSourceOf(source)
  if (!opts) return
  void watchCatchUpSettle(opts.automationId, runId, { scheduledAt: opts.scheduledAt })
}

/** 没续上的补跑才标 interrupted_by_restart。 */
export function stampUnrestoredCatchUp(runId: string, source: unknown): void {
  if (!catchUpSourceOf(source)) return
  failCatchUpWaiting(defaultSettingsIo(), runId, Date.now(), stampInterruptedAutomation)
}
