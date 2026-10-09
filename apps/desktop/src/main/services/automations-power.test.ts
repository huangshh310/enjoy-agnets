/**
 * 启动 / 唤醒必须钉住 scanFromAt：滴答会把 lastAlive 写成现在。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { reconcileMissedAutomations } from "./automations-missed-reconcile.ts"
import {
  lookbackAliveAt,
  memorySettingsIo,
  readAliveState,
  writeAliveState
} from "./automations-missed-store.ts"
import {
  markAutomationSessionStarted,
  recordAutomationResume,
  recordAutomationSuspend,
  stampAutomationAlive
} from "./automations-power.ts"

const TZ = "Asia/Shanghai"
const now = Date.parse("2026-10-09T02:00:00.000Z")
const lastAlive = Date.parse("2026-10-08T16:00:00.000Z")
const eight = Date.parse("2026-10-09T00:00:00.000Z")

const item = {
  id: "auto_1",
  name: "晨间",
  prompt: "x",
  trigger: "cron" as const,
  cronExpr: "0 8 * * *",
  timeZone: TZ,
  enabled: true,
  catchUpMissed: false,
  updatedAt: 1
}

test("唤醒先 stamp lastAlive 仍能扫到睡眠窗内的点", () => {
  const io = memorySettingsIo()
  const suspendAt = lastAlive + 30 * 60_000
  writeAliveState(io, { lastAliveAt: lastAlive, sleepWindows: [] })
  recordAutomationSuspend(suspendAt, io)
  recordAutomationResume(now, io)
  stampAutomationAlive(now, io)
  const alive = readAliveState(io)
  assert.equal(lookbackAliveAt(alive), suspendAt)
  assert.equal(alive.lastAliveAt, now)
  const results = reconcileMissedAutomations({
    trigger: "resume",
    now,
    sessionStartedAt: now,
    io,
    items: [item]
  })
  assert.ok(results[0]?.actions.some((row) => row.scheduledAt === eight && row.reason === "system_sleep"))
})

test("启动钉住上次活着时间，滴答改 lastAlive 不扫空", () => {
  const io = memorySettingsIo()
  writeAliveState(io, { lastAliveAt: lastAlive, sleepWindows: [] })
  markAutomationSessionStarted(now, io)
  stampAutomationAlive(now, io)
  assert.equal(lookbackAliveAt(readAliveState(io)), lastAlive)
  const results = reconcileMissedAutomations({
    trigger: "startup",
    now,
    sessionStartedAt: now,
    io,
    items: [item]
  })
  assert.ok(results[0]?.actions.some((row) => row.reason === "app_not_running"))
})
