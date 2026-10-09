/**
 * E2E 夹具：种下跳过 / 连续错过 / 补跑 / 超时行，给 AUTO-P2 窗口冒烟用。
 */
import { MISSED_STORE_KEY } from "./automations-missed-store"
import { setSetting } from "./database"
import { isE2eStub } from "./e2e-stub"

function atHour(daysAgo: number, hour: number, now: number): number {
  const date = new Date(now)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, 0, 0, 0)
  return date.getTime()
}

export function seedE2eAutomations(now = Date.now()): void {
  if (!isE2eStub()) return
  const today8 = atHour(0, 8, now)
  const yest8 = atHour(1, 8, now)
  const ere8 = atHour(2, 8, now)
  const yest21 = atHour(1, 21, now)
  const today1030 = atHour(0, 10, now) + 30 * 60_000
  setSetting(
    "automations",
    JSON.stringify([
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
        name: "午间 diff 复盘",
        cronExpr: "30 10 * * *",
        lastRunAt: now,
        lastRunStatus: "ok",
        lastRunCatchUp: true,
        catchUpMissed: true
      }),
      row({
        id: "auto_timeout",
        name: "补跑超时示例",
        cronExpr: "0 9 * * *",
        lastRunAt: now,
        lastRunStatus: "failed",
        lastRunErrorCode: "catch_up_approval_timeout",
        lastRunCatchUp: true,
        catchUpMissed: true
      })
    ])
  )
  setSetting(
    MISSED_STORE_KEY,
    JSON.stringify([
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
    ])
  )
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
