/**
 * 重启后把没续上的补跑 running 收成 failed，不 invent 新跳过原因。
 */
import { CATCH_UP_INTERRUPTED_BY_RESTART } from "@enjoy-agents/ipc-contract/automations-missed"
import {
  listStoredMissed,
  patchMissedPoint,
  type SettingsIo,
  type StoredMissed
} from "./automations-missed-store.ts"

export function shouldFailInterruptedCatchUp(
  record: Pick<StoredMissed, "kind" | "status" | "runId">,
  liveStatus?: string
): boolean {
  if (record.kind !== "catch_up" || record.status !== "running") return false
  if (!record.runId) return true
  return liveStatus !== "running"
}

export function restoreWaitingCatchUpAction(source?: unknown): "fail_interrupted" | "restore" {
  if (!source || typeof source !== "object") return "restore"
  return (source as { isCatchUp?: boolean }).isCatchUp === true ? "fail_interrupted" : "restore"
}

/** 本进程已挂上的补跑 waiting 不是重启残留，窗口重建不得再标 failed。 */
export function shouldFailWaitingCatchUp(source: unknown, live: boolean): boolean {
  if (live) return false
  return restoreWaitingCatchUpAction(source) === "fail_interrupted"
}

/** 重启恢复补跑 waiting：只收当前 runId，不误伤 restoreRunning 还在跑的补跑。 */
export function failCatchUpWaiting(
  io: SettingsIo,
  runId: string,
  now = Date.now(),
  stampAutomation?: (automationId: string) => void
): StoredMissed[] {
  const failed: StoredMissed[] = []
  for (const row of listStoredMissed(io, now)) {
    if (row.runId !== runId) continue
    if (!shouldFailInterruptedCatchUp(row, "waiting_review")) continue
    const next = patchMissedPoint(
      io,
      row.automationId,
      row.scheduledAt,
      { status: "failed", code: CATCH_UP_INTERRUPTED_BY_RESTART },
      now
    )
    if (!next) continue
    stampAutomation?.(row.automationId)
    failed.push(next)
  }
  return failed
}

export function failInterruptedCatchUps(
  io: SettingsIo,
  liveStatusOf: (runId: string) => string | undefined,
  now = Date.now(),
  stampAutomation?: (automationId: string) => void
): StoredMissed[] {
  const failed: StoredMissed[] = []
  for (const row of listStoredMissed(io, now)) {
    const live = row.runId ? liveStatusOf(row.runId) : undefined
    if (!shouldFailInterruptedCatchUp(row, live)) continue
    const next = patchMissedPoint(
      io,
      row.automationId,
      row.scheduledAt,
      { status: "failed", code: CATCH_UP_INTERRUPTED_BY_RESTART },
      now
    )
    if (!next) continue
    stampAutomation?.(row.automationId)
    failed.push(next)
  }
  return failed
}
