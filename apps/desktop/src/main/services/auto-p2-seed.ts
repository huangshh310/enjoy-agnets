/**
 * AUTO-P2 复检夹具。只写 settings 行，不改 IPC。
 * 开发态 + 隔离 userData 才写；打包产物即使带环境变量也不写。
 */
import { MISSED_STORE_KEY } from "./automations-missed-store"
import { setSetting } from "./database"

export function isDevAutoP2SeedAllowed(input: {
  flag: boolean
  packaged: boolean
  isolatedUserData: boolean
}): boolean {
  return input.flag && !input.packaged && input.isolatedUserData
}

/**
 * jojo P3：夹具时间一律不晚于 now——「今天 08:00」在早上 7 点种出来就是未来，
 * 列表会写「上次成功 · 今天 xx:xx」比现在还晚。落在未来的整体往前挪一天。
 */
function atHour(daysAgo: number, hour: number, now: number, minute = 0): number {
  const date = new Date(now)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, minute, 0, 0)
  if (date.getTime() > now) date.setDate(date.getDate() - 1)
  return date.getTime()
}

/** 补跑成功 / 超时：记在排期之后一会儿（不晚于 now），不是「种夹具那一刻」。 */
function catchUpAt(slot: number, now: number): number {
  return Math.min(now, slot + 5 * 60_000)
}

function row(input: Record<string, unknown>) {
  return {
    prompt: "e2e",
    trigger: "cron",
    triggers: ["cron"],
    enabled: true,
    updatedAt: Date.now(),
    catchUpMissed: false,
    ...input
  }
}

function missed(
  automationId: string,
  scheduledAt: number,
  kind: "skipped" | "catch_up",
  extra: Record<string, unknown>
) {
  return {
    automationId,
    scheduledAt,
    recordedAt: typeof extra.recordedAt === "number" ? extra.recordedAt : scheduledAt,
    kind,
    ...extra
  }
}

export function buildAutoP2Fixture(now = Date.now(), extras = false) {
  const today8 = atHour(0, 8, now)
  const yest8 = atHour(1, 8, now)
  const ere8 = atHour(2, 8, now)
  const yest21 = atHour(1, 21, now)
  const today1030 = atHour(0, 10, now, 30)
  const today11 = atHour(0, 11, now)
  const today7 = atHour(0, 7, now)
  const yest7 = atHour(1, 7, now)
  const ere7 = atHour(2, 7, now)
  const automations = [
    row({
      id: "auto_sleep",
      name: "晨间待办整理",
      cronExpr: "0 8 * * *",
      lastRunAt: today8,
      lastRunStatus: "skipped",
      lastSkipReason: "system_sleep"
    }),
    row({
      id: "auto_closed",
      name: "晚间日志归档",
      cronExpr: "0 21 * * *",
      lastRunAt: yest21,
      lastRunStatus: "skipped",
      lastSkipReason: "app_not_running"
    }),
    row({
      id: "auto_catchup",
      name: "午间改动复盘",
      cronExpr: "30 10 * * *",
      lastRunAt: catchUpAt(today1030, now),
      lastRunStatus: "ok",
      lastRunCatchUp: true,
      catchUpMissed: true
    }),
    row({
      id: "auto_timeout",
      name: "补跑超时示例",
      cronExpr: "0 9 * * *",
      lastRunAt: catchUpAt(atHour(0, 9, now), now),
      lastRunStatus: "failed",
      lastRunErrorCode: "catch_up_approval_timeout",
      lastRunCatchUp: true,
      catchUpMissed: true
    })
  ]
  const records = [
    missed("auto_sleep", today8, "skipped", { reason: "system_sleep", status: "skipped" }),
    missed("auto_sleep", yest8, "skipped", { reason: "system_sleep", status: "skipped" }),
    missed("auto_sleep", ere8, "skipped", { reason: "system_sleep", status: "skipped" }),
    missed("auto_closed", yest21, "skipped", { reason: "app_not_running", status: "skipped" }),
    missed("auto_catchup", today1030, "catch_up", { status: "ok", isCatchUp: true, recordedAt: now }),
    missed("auto_catchup", yest8, "skipped", { reason: "system_sleep", status: "skipped" }),
    missed("auto_timeout", today8, "catch_up", {
      status: "failed",
      isCatchUp: true,
      code: "catch_up_approval_timeout",
      recordedAt: now
    })
  ]
  if (extras) {
    automations.push(
      row({
        id: "auto_busy",
        name: "忙时跳过示例",
        cronExpr: "0 11 * * *",
        lastRunAt: today11,
        lastRunStatus: "skipped",
        lastSkipReason: "previous_still_running"
      }),
      row({
        id: "auto_mixed",
        name: "混因错过示例",
        cronExpr: "0 7 * * *",
        lastRunAt: today7,
        lastRunStatus: "skipped",
        lastSkipReason: "app_not_running"
      }),
      row({
        id: "auto_interrupt",
        name: "补跑重启打断示例",
        cronExpr: "0 9 * * *",
        lastRunAt: now,
        lastRunStatus: "failed",
        lastRunErrorCode: "interrupted_by_restart",
        lastRunCatchUp: true,
        catchUpMissed: true
      })
    )
    records.push(
      missed("auto_busy", today11, "skipped", { reason: "previous_still_running", status: "skipped" }),
      missed("auto_mixed", today7, "skipped", { reason: "app_not_running", status: "skipped" }),
      missed("auto_mixed", yest7, "skipped", { reason: "system_sleep", status: "skipped" }),
      missed("auto_mixed", ere7, "skipped", { reason: "previous_still_running", status: "skipped" }),
      missed("auto_interrupt", today8, "catch_up", {
        status: "failed",
        isCatchUp: true,
        code: "interrupted_by_restart",
        recordedAt: now
      })
    )
  }
  return { automations, records }
}

export function writeAutoP2Fixture(fixture: ReturnType<typeof buildAutoP2Fixture>): void {
  setSetting("automations", JSON.stringify(fixture.automations))
  setSetting(MISSED_STORE_KEY, JSON.stringify(fixture.records))
}
