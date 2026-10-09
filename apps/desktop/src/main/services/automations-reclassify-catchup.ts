/**
 * 准点已在跑时，已占住的补跑记录改记 previous_still_running 跳过。
 */
import {
  findMissedPoint,
  patchMissedPoint,
  type SettingsIo
} from "./automations-missed-store.ts"

export function reclassifyBlockedCatchUp(
  io: SettingsIo,
  automationId: string,
  scheduledAt: number,
  now = Date.now()
): boolean {
  const existing = findMissedPoint(io, automationId, scheduledAt)
  if (existing?.kind !== "catch_up" || existing.runId) return false
  return Boolean(
    patchMissedPoint(
      io,
      automationId,
      scheduledAt,
      {
        kind: "skipped",
        status: "skipped",
        isCatchUp: false,
        reason: "previous_still_running"
      },
      now
    )
  )
}
