/**
 * 本机 cron 滴答 + webhook + 启动/唤醒错过回看。
 */
import type { Automation } from "@enjoy-agents/ipc-contract"
import { shouldFireCron } from "./automations-cron"
import { alignCronMinute } from "./automations-cron-points"
import { skipReasonOf } from "./automations-missed-apply"
import { listCatchUpLaunches } from "./automations-catchup-launch"
import { failInterruptedCatchUps } from "./automations-catchup-orphans"
import {
  reconcileMissedAutomations,
  type MissedReconcileResult
} from "./automations-missed-reconcile"
import type { MissedScanTrigger } from "./automations-missed-reason"
import {
  claimMissedPoint,
  clearAutomationScanFrom,
  defaultSettingsIo,
  findMissedPoint
} from "./automations-missed-store"
import { getDatabase } from "./database"
import { getRun } from "@enjoy-agents/db"
import {
  automationSessionStartedAt,
  bindAutomationPowerMonitor,
  electronPowerMonitorHooks,
  markAutomationSessionStarted,
  stampAutomationAlive,
  unbindAutomationPowerMonitor
} from "./automations-power"
import { cancelOnSaveFire, launchAutomationAgent } from "./automations-run"
import { emitAutomationsChanged, firstLiveWindow } from "./automations-notify"
import { isAutomationRunning, patchStoredAutomation, readAutomations } from "./automations-store"
import { stopWebhookListeners, syncWebhookListeners } from "./automations-webhook"
import { tickSessionHeartbeats } from "./session-heartbeat-tick"

const DEFAULT_INTERVAL_MS = 20_000
let timer: ReturnType<typeof setInterval> | undefined
let reconcileChain: Promise<void> = Promise.resolve()

export function startAutomationScheduler(intervalMs = DEFAULT_INTERVAL_MS): void {
  stopAutomationScheduler()
  const startedAt = markAutomationSessionStarted()
  bindAutomationPowerMonitor(electronPowerMonitorHooks(), () => {
    void enqueueMissedReconcile("resume")
  })
  timer = setInterval(() => {
    void tickAutomations(new Date())
  }, intervalMs)
  void tickAutomations(new Date())
  void syncWebhookListeners()
  void enqueueMissedReconcile("startup", startedAt)
}

export function stopAutomationScheduler(): void {
  if (timer) clearInterval(timer)
  timer = undefined
  unbindAutomationPowerMonitor()
  stampAutomationAlive()
  cancelOnSaveFire()
  void stopWebhookListeners()
}

export async function tickAutomations(now: Date): Promise<string[]> {
  const window = firstLiveWindow()
  if (!window) return []
  stampAutomationAlive(now.getTime())
  void tickSessionHeartbeats(window, now).catch(() => undefined)
  const fired: string[] = []
  for (const item of readAutomations()) {
    const due = cronDue(item, now)
    if (!due) continue
    if (isAutomationRunning(item.id)) {
      recordBusySkip(item, now.getTime())
      continue
    }
    fired.push(item.id)
    void launchAutomationAgent(window, item, { scheduledAt: alignCronMinute(now.getTime()) }).catch(() => {
      // 失败已 stamp run.error + lastRunStatus；滴答继续看下一条。
    })
  }
  return fired
}

export function enqueueMissedReconcile(trigger: MissedScanTrigger, sessionStartedAt?: number): Promise<void> {
  const started = sessionStartedAt ?? (automationSessionStartedAt() || markAutomationSessionStarted())
  const next = reconcileChain.then(() => applyMissedReconcile(trigger, started))
  reconcileChain = next.then(
    () => undefined,
    () => undefined
  )
  return next
}

async function applyMissedReconcile(trigger: MissedScanTrigger, sessionStartedAt: number): Promise<void> {
  const now = Date.now()
  const io = defaultSettingsIo()
  if (trigger === "startup") {
    failInterruptedCatchUps(io, (runId) => getRun(getDatabase(), runId)?.status)
  }
  const results = reconcileMissedAutomations({
    trigger,
    now,
    sessionStartedAt,
    items: readAutomations(),
    runningIds: new Set(readAutomations().filter((row) => isAutomationRunning(row.id)).map((row) => row.id))
  })
  if (results.length === 0) {
    clearAutomationScanFrom(io)
    return
  }
  stampMissedRows(results, now)
  emitAutomationsChanged("missed")
  fireCatchUps(results)
  clearAutomationScanFrom(io)
}

function stampMissedRows(results: MissedReconcileResult[], now: number): void {
  for (const result of results) {
    const latestSkip = [...result.actions].reverse().find((row) => row.type === "skip")
    if (!latestSkip || result.actions.some((row) => row.type === "catch_up")) continue
    patchStoredAutomation(result.automationId, {
      lastRunAt: latestSkip.scheduledAt,
      lastRunStatus: "skipped",
      lastRunCatchUp: false,
      lastSkipReason: skipReasonOf(result.actions),
      lastError: undefined,
      lastRunErrorCode: undefined,
      updatedAt: now
    })
  }
}

function fireCatchUps(results: MissedReconcileResult[]): void {
  const window = firstLiveWindow()
  if (!window) return
  for (const launch of listCatchUpLaunches(results)) {
    const item = readAutomations().find((row) => row.id === launch.automationId)
    if (!item) continue
    void launchAutomationAgent(window, item, {
      scheduledAt: launch.scheduledAt,
      isCatchUp: true
    }).catch(() => undefined)
  }
}

function cronDue(item: Automation, now: Date): boolean {
  return shouldFireCron({
    enabled: item.enabled,
    trigger: item.trigger,
    triggers: item.triggers,
    cronExpr: item.cronExpr,
    timeZone: item.timeZone,
    lastRunAt: item.lastRunAt,
    running: false,
    now
  })
}

function recordBusySkip(item: Automation, now: number): void {
  const scheduledAt = alignCronMinute(now)
  const io = defaultSettingsIo()
  if (findMissedPoint(io, item.id, scheduledAt)) return
  if (
    !claimMissedPoint(io, {
      automationId: item.id,
      scheduledAt,
      recordedAt: now,
      kind: "skipped",
      reason: "previous_still_running",
      status: "skipped",
      isCatchUp: false
    })
  ) {
    return
  }
  patchStoredAutomation(item.id, {
    lastRunStatus: "skipped",
    lastRunCatchUp: false,
    lastSkipReason: "previous_still_running",
    lastRunAt: scheduledAt,
    lastError: undefined,
    lastRunErrorCode: undefined
  })
  emitAutomationsChanged("missed", item.id)
}
