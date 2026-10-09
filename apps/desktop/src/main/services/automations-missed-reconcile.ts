/**
 * 启动 / 唤醒回看错过点。只写本机 missed store；行状态由调用方 stamp。
 */
import type { Automation } from "@enjoy-agents/ipc-contract"
import { applyMissedActions } from "./automations-missed-apply.ts"
import { planMissedActions, type PlannedMissedAction } from "./automations-missed-plan.ts"
import type { MissedScanTrigger } from "./automations-missed-reason.ts"
import {
  defaultSettingsIo,
  listStoredMissed,
  lookbackAliveAt,
  readAliveState,
  type SettingsIo
} from "./automations-missed-store.ts"

export type MissedReconcileResult = {
  automationId: string
  name: string
  actions: PlannedMissedAction[]
}

export function reconcileMissedAutomations(input: {
  trigger: MissedScanTrigger
  now?: number
  sessionStartedAt: number
  io?: SettingsIo
  items: Automation[]
  runningIds?: ReadonlySet<string>
}): MissedReconcileResult[] {
  const now = input.now ?? Date.now()
  const io = input.io ?? defaultSettingsIo()
  const alive = readAliveState(io)
  const stored = listStoredMissed(io, now)
  const results: MissedReconcileResult[] = []
  for (const item of input.items) {
    const claimedSlots = stored
      .filter((row) => row.automationId === item.id)
      .map((row) => row.scheduledAt)
    const planned = planMissedActions({
      cronExpr: item.cronExpr,
      timeZone: item.timeZone,
      enabled: item.enabled,
      catchUpMissed: item.catchUpMissed === true,
      lastRunAt: item.lastRunAt,
      lastRunCatchUp: item.lastRunCatchUp,
      claimedSlots,
      now,
      trigger: input.trigger,
      sleepWindows: alive.sleepWindows,
      runningWindows: [],
      lastAliveAt: lookbackAliveAt(alive),
      sessionStartedAt: input.sessionStartedAt,
      currentlyRunning: input.runningIds?.has(item.id) === true,
      triggerKind: item.trigger,
      triggers: item.triggers
    })
    const accepted = applyMissedActions(io, item.id, planned, now)
    if (accepted.length) results.push({ automationId: item.id, name: item.name, actions: accepted })
  }
  return results
}
