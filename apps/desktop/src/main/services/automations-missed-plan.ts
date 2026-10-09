/**
 * 计算一条 cron 自动化在回看窗里要记跳过还是补跑。纯函数，方便对 M1–M6。
 */
import { MISSED_LOOKBACK_MS } from "@enjoy-agents/ipc-contract/automations-missed"
import type { AutomationSkipReason } from "@enjoy-agents/ipc-contract"
import { alignCronMinute, listCronPoints } from "./automations-cron-points.ts"
import { classifyMissedReason, type ClassifyMissedInput, type MissedScanTrigger } from "./automations-missed-reason.ts"

export type PlannedMissedAction =
  | { type: "skip"; scheduledAt: number; reason: AutomationSkipReason }
  | { type: "catch_up"; scheduledAt: number; reason: AutomationSkipReason }

export type PlanMissedInput = {
  cronExpr?: string
  timeZone?: string
  enabled: boolean
  catchUpMissed?: boolean
  lastRunAt?: number
  lastRunCatchUp?: boolean
  claimedSlots: readonly number[]
  now: number
  trigger: MissedScanTrigger
  sleepWindows: ClassifyMissedInput["sleepWindows"]
  runningWindows: ClassifyMissedInput["runningWindows"]
  lastAliveAt?: number
  sessionStartedAt: number
  currentlyRunning?: boolean
}

function hasCronTrigger(item: { trigger?: string; triggers?: string[] }): boolean {
  return item.trigger === "cron" || Boolean(item.triggers?.includes("cron"))
}

/** 已准点跑过的分钟不当错过。 */
export function sameCronSlot(left: number, right: number): boolean {
  return alignCronMinute(left) === alignCronMinute(right)
}

export function planMissedActions(
  item: PlanMissedInput & { triggerKind?: string; triggers?: string[] }
): PlannedMissedAction[] {
  if (!item.enabled) return []
  if (item.triggerKind && !hasCronTrigger({ trigger: item.triggerKind, triggers: item.triggers })) {
    return []
  }
  const expr = item.cronExpr?.trim()
  if (!expr) return []
  const window = missedLookbackWindow(item)
  if (!window) return []
  const claimed = new Set(item.claimedSlots.map(alignCronMinute))
  if (item.lastRunAt && !item.lastRunCatchUp) claimed.add(alignCronMinute(item.lastRunAt))
  const actions = listCronPoints({
    cronExpr: expr,
    timeZone: item.timeZone || "UTC",
    fromMs: window.fromMs,
    toMs: window.toMs
  })
    .filter((slot) => !claimed.has(slot))
    .map((scheduledAt) => ({
      scheduledAt,
      reason: classifyMissedReason({
        scheduledAt,
        trigger: item.trigger,
        sleepWindows: item.sleepWindows,
        runningWindows: item.runningWindows,
        lastAliveAt: item.lastAliveAt,
        sessionStartedAt: item.sessionStartedAt,
        currentlyRunning: item.currentlyRunning
      })
    }))
  return assignCatchUp(actions, item.catchUpMissed === true)
}

function missedLookbackWindow(item: PlanMissedInput): { fromMs: number; toMs: number } | null {
  const toMs = alignCronMinute(item.now) - 60_000
  const floor = item.now - MISSED_LOOKBACK_MS
  const fromMs =
    item.lastAliveAt && item.lastAliveAt > 0 ? Math.max(floor, item.lastAliveAt) : item.now
  if (toMs < fromMs) return null
  return { fromMs, toMs }
}

function assignCatchUp(
  actions: { scheduledAt: number; reason: AutomationSkipReason }[],
  catchUp: boolean
): PlannedMissedAction[] {
  const latest = actions.at(-1)?.scheduledAt
  if (latest == null) return []
  return actions.map((row) =>
    catchUp && row.scheduledAt === latest
      ? { type: "catch_up" as const, ...row }
      : { type: "skip" as const, ...row }
  )
}
