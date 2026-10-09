/**
 * 准点与补跑互斥占槽。同一计划分钟只能有一种。
 */
import {
  claimMissedPoint,
  findMissedPoint,
  type SettingsIo
} from "./automations-missed-store.ts"

export function claimLaunchSlot(
  io: SettingsIo,
  automationId: string,
  opts: { scheduledAt?: number; isCatchUp?: boolean }
): boolean {
  if (opts.scheduledAt == null) return true
  const existing = findMissedPoint(io, automationId, opts.scheduledAt)
  if (opts.isCatchUp) return existing?.kind === "catch_up"
  if (existing) return false
  return claimMissedPoint(io, {
    automationId,
    scheduledAt: opts.scheduledAt,
    recordedAt: Date.now(),
    kind: "scheduled",
    status: "running"
  })
}
