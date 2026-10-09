/**
 * 本机错过记录。独立 settings 键，不进 automations JSON，不上云。
 */
import {
  MISSED_LOOKBACK_MS,
  type AutomationMissedKind,
  type AutomationMissedRecord as MissedRecord
} from "@enjoy-agents/ipc-contract/automations-missed"
import type {
  AutomationErrorCode,
  AutomationRunStatus,
  AutomationSkipReason
} from "@enjoy-agents/ipc-contract"
import { alignCronMinute } from "./automations-cron-points.ts"
import { getSetting, setSetting } from "./database.ts"

export const MISSED_STORE_KEY = "automation_missed_local"
export const SCHEDULER_ALIVE_KEY = "automation_scheduler_alive"

export type SettingsIo = {
  get(key: string): string | undefined
  set(key: string, value: string): void
}

export type SchedulerAliveState = {
  lastAliveAt: number
  /** 本轮启动/唤醒回看起点。滴答会改 lastAliveAt，不能当回看地板。 */
  scanFromAt?: number
  lastSuspendAt?: number
  sessionStartedAt?: number
  sleepWindows: { start: number; end: number }[]
}

/** 本机还可记准点占用，列表不回这条。 */
export type StoredMissedKind = AutomationMissedKind | "scheduled"

export type StoredMissed = {
  automationId: string
  scheduledAt: number
  recordedAt: number
  kind: StoredMissedKind
  reason?: AutomationSkipReason
  status?: AutomationRunStatus
  runId?: string
  isCatchUp?: boolean
  code?: AutomationErrorCode
}

export function defaultSettingsIo(): SettingsIo {
  return { get: getSetting, set: setSetting }
}

export function memorySettingsIo(seed: Record<string, string> = {}): SettingsIo {
  const map = new Map(Object.entries(seed))
  return {
    get: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value)
    }
  }
}

function readRows(io: SettingsIo): StoredMissed[] {
  const raw = io.get(MISSED_STORE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const row = parseStoredMissed(item)
      return row ? [row] : []
    })
  } catch {
    return []
  }
}

function parseStoredMissed(item: unknown): StoredMissed | null {
  if (!item || typeof item !== "object") return null
  const row = item as Record<string, unknown>
  if (typeof row.automationId !== "string" || typeof row.scheduledAt !== "number") return null
  if (row.kind !== "skipped" && row.kind !== "catch_up" && row.kind !== "scheduled") return null
  return {
    automationId: row.automationId,
    scheduledAt: row.scheduledAt,
    recordedAt: typeof row.recordedAt === "number" ? row.recordedAt : row.scheduledAt,
    kind: row.kind,
    reason:
      row.reason === "system_sleep" ||
      row.reason === "app_not_running" ||
      row.reason === "previous_still_running"
        ? row.reason
        : undefined,
    status:
      row.status === "ok" ||
      row.status === "failed" ||
      row.status === "running" ||
      row.status === "skipped"
        ? row.status
        : undefined,
    runId: typeof row.runId === "string" ? row.runId : undefined,
    isCatchUp: row.isCatchUp === true,
    code:
      row.code === "catch_up_approval_timeout" || row.code === "interrupted_by_restart"
        ? row.code
        : undefined
  }
}

function writeRows(io: SettingsIo, rows: StoredMissed[]): void {
  io.set(MISSED_STORE_KEY, JSON.stringify(rows))
}

/** 丢掉 7 天外的记录。调用方每次读写都走这里。 */
export function pruneMissedRecords(rows: StoredMissed[], now: number): StoredMissed[] {
  const floor = now - MISSED_LOOKBACK_MS
  return rows.filter((row) => row.scheduledAt >= floor || row.recordedAt >= floor)
}

export function listStoredMissed(io: SettingsIo, now = Date.now()): StoredMissed[] {
  const next = pruneMissedRecords(readRows(io), now)
  writeRows(io, next)
  return next
}

export function findMissedPoint(
  io: SettingsIo,
  automationId: string,
  scheduledAt: number
): StoredMissed | undefined {
  const slot = alignCronMinute(scheduledAt)
  return listStoredMissed(io).find(
    (row) => row.automationId === automationId && alignCronMinute(row.scheduledAt) === slot
  )
}

/** 同一计划点只能占一次。查+写同步、中间不能 await，进程内并发只有一个成功。 */
export function claimMissedPoint(io: SettingsIo, record: StoredMissed, now = Date.now()): boolean {
  const current = pruneMissedRecords(readRows(io), now)
  const slot = alignCronMinute(record.scheduledAt)
  if (current.some((row) => row.automationId === record.automationId && alignCronMinute(row.scheduledAt) === slot)) {
    return false
  }
  current.push({ ...record, scheduledAt: slot, recordedAt: record.recordedAt || now })
  writeRows(io, current)
  return true
}

export function patchMissedPoint(
  io: SettingsIo,
  automationId: string,
  scheduledAt: number,
  patch: Partial<StoredMissed>,
  now = Date.now()
): StoredMissed | undefined {
  const current = pruneMissedRecords(readRows(io), now)
  const slot = alignCronMinute(scheduledAt)
  let updated: StoredMissed | undefined
  const next = current.map((row) => {
    if (row.automationId !== automationId || alignCronMinute(row.scheduledAt) !== slot) return row
    updated = { ...row, ...patch, automationId, scheduledAt: slot }
    return updated
  })
  if (updated) writeRows(io, next)
  return updated
}

/** 抽屉列表：只回跳过与补跑。 */
export function listMissedForAutomation(
  io: SettingsIo,
  automationId: string,
  now = Date.now()
): MissedRecord[] {
  return listStoredMissed(io, now)
    .filter((row) => row.automationId === automationId && (row.kind === "skipped" || row.kind === "catch_up"))
    .sort((left, right) => right.scheduledAt - left.scheduledAt)
    .map((row) => ({
      automationId: row.automationId,
      scheduledAt: row.scheduledAt,
      recordedAt: row.recordedAt,
      kind: row.kind === "catch_up" ? ("catch_up" as const) : ("skipped" as const),
      reason: row.reason,
      status: row.status,
      runId: row.runId,
      isCatchUp: row.isCatchUp,
      code: row.code
    }))
}

export function readAliveState(io: SettingsIo): SchedulerAliveState {
  const raw = io.get(SCHEDULER_ALIVE_KEY)
  if (!raw) return { lastAliveAt: 0, sleepWindows: [] }
  try {
    const parsed = JSON.parse(raw) as SchedulerAliveState
    return {
      lastAliveAt: typeof parsed.lastAliveAt === "number" ? parsed.lastAliveAt : 0,
      scanFromAt: typeof parsed.scanFromAt === "number" ? parsed.scanFromAt : undefined,
      lastSuspendAt: typeof parsed.lastSuspendAt === "number" ? parsed.lastSuspendAt : undefined,
      sessionStartedAt: typeof parsed.sessionStartedAt === "number" ? parsed.sessionStartedAt : undefined,
      sleepWindows: Array.isArray(parsed.sleepWindows) ? parsed.sleepWindows : []
    }
  } catch {
    return { lastAliveAt: 0, sleepWindows: [] }
  }
}

export function writeAliveState(io: SettingsIo, state: SchedulerAliveState): void {
  const floor = Date.now() - MISSED_LOOKBACK_MS
  io.set(
    SCHEDULER_ALIVE_KEY,
    JSON.stringify({
      ...state,
      sleepWindows: state.sleepWindows.filter((window) => window.end >= floor)
    })
  )
}

/** 回看地板：优先本轮 scanFromAt，避免滴答把 lastAlive 写成现在后扫空。 */
export function lookbackAliveAt(state: SchedulerAliveState): number {
  if (state.scanFromAt && state.scanFromAt > 0) return state.scanFromAt
  return state.lastAliveAt
}

export function clearAutomationScanFrom(io: SettingsIo): void {
  const current = readAliveState(io)
  if (current.scanFromAt == null) return
  writeAliveState(io, { ...current, scanFromAt: undefined })
}
