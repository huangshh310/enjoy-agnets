/**
 * 把计划点写入本机 store。同一分钟只能占一次。
 */
import type { AutomationSkipReason } from "@enjoy-agents/ipc-contract"
import { claimMissedPoint, type SettingsIo, type StoredMissed } from "./automations-missed-store.ts"
import type { PlannedMissedAction } from "./automations-missed-plan.ts"

export function applyMissedActions(
  io: SettingsIo,
  automationId: string,
  actions: PlannedMissedAction[],
  now = Date.now()
): PlannedMissedAction[] {
  const accepted: PlannedMissedAction[] = []
  for (const action of actions) {
    const record = toStored(automationId, action, now)
    if (claimMissedPoint(io, record, now)) accepted.push(action)
  }
  return accepted
}

function toStored(automationId: string, action: PlannedMissedAction, now: number): StoredMissed {
  if (action.type === "skip") {
    return {
      automationId,
      scheduledAt: action.scheduledAt,
      recordedAt: now,
      kind: "skipped",
      reason: action.reason,
      status: "skipped",
      isCatchUp: false
    }
  }
  return {
    automationId,
    scheduledAt: action.scheduledAt,
    recordedAt: now,
    kind: "catch_up",
    reason: action.reason,
    status: "running",
    isCatchUp: true
  }
}

export function skipReasonOf(actions: PlannedMissedAction[]): AutomationSkipReason | undefined {
  return [...actions].reverse().find((row) => row.type === "skip")?.reason
}
