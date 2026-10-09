import assert from "node:assert/strict"
import { test } from "node:test"
import { listCatchUpLaunches } from "./automations-catchup-launch.ts"
import { applyMissedActions } from "./automations-missed-apply.ts"
import { reconcileMissedAutomations } from "./automations-missed-reconcile.ts"
import { clearAutomationScanFrom, memorySettingsIo, writeAliveState } from "./automations-missed-store.ts"

const TZ = "Asia/Shanghai"
const now = Date.parse("2026-10-09T02:00:00.000Z")
const lastAlive = Date.parse("2026-10-07T16:00:00.000Z")

test("一条补跑停着不挡另一条的补跑列表", () => {
  const launches = listCatchUpLaunches([
    {
      automationId: "auto_a",
      name: "A",
      actions: [{ type: "catch_up", scheduledAt: 1, reason: "system_sleep" }]
    },
    {
      automationId: "auto_b",
      name: "B",
      actions: [{ type: "catch_up", scheduledAt: 2, reason: "app_not_running" }]
    }
  ])
  assert.deepEqual(launches, [
    { automationId: "auto_a", scheduledAt: 1 },
    { automationId: "auto_b", scheduledAt: 2 }
  ])
})

test("回看后立刻清 scanFrom，不因补跑停 Dock 堵住下一次唤醒", () => {
  const io = memorySettingsIo()
  writeAliveState(io, { lastAliveAt: lastAlive, scanFromAt: lastAlive, sleepWindows: [] })
  const item = {
    id: "auto_1",
    name: "晨间",
    prompt: "x",
    trigger: "cron" as const,
    cronExpr: "0 8 * * *",
    timeZone: TZ,
    enabled: true,
    catchUpMissed: true,
    updatedAt: 1
  }
  const first = reconcileMissedAutomations({
    trigger: "resume",
    now,
    sessionStartedAt: now,
    io,
    items: [item]
  })
  assert.ok(listCatchUpLaunches(first).length >= 1)
  applyMissedActions(io, "auto_1", first[0]?.actions ?? [], now)
  clearAutomationScanFrom(io)
  const second = reconcileMissedAutomations({
    trigger: "resume",
    now,
    sessionStartedAt: now,
    io,
    items: [item]
  })
  assert.equal(second.length, 0)
})
