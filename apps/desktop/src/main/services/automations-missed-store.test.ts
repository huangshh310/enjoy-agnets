import assert from "node:assert/strict"
import { test } from "node:test"
import {
  MISSED_STORE_KEY,
  claimMissedPoint,
  findMissedPoint,
  listMissedForAutomation,
  memorySettingsIo,
  pruneMissedRecords
} from "./automations-missed-store.ts"

test("同一计划点只能占一次（启动+唤醒撞车）", () => {
  const io = memorySettingsIo()
  const now = Date.now()
  const row = {
    automationId: "auto_1",
    scheduledAt: now,
    recordedAt: now,
    kind: "skipped" as const,
    reason: "system_sleep" as const,
    status: "skipped" as const
  }
  assert.equal(claimMissedPoint(io, row, now), true)
  assert.equal(claimMissedPoint(io, { ...row, reason: "app_not_running" }, now + 1), false)
  assert.equal(findMissedPoint(io, "auto_1", now)?.reason, "system_sleep")
})

test("重启后 store 仍认已占点，列表不含准点 scheduled", () => {
  const io = memorySettingsIo()
  const now = Date.now()
  claimMissedPoint(
    io,
    {
      automationId: "auto_1",
      scheduledAt: now - 60_000,
      recordedAt: now,
      kind: "scheduled",
      status: "ok"
    },
    now
  )
  claimMissedPoint(
    io,
    {
      automationId: "auto_1",
      scheduledAt: now,
      recordedAt: now,
      kind: "catch_up",
      status: "ok",
      isCatchUp: true
    },
    now
  )
  const listed = listMissedForAutomation(io, "auto_1", now)
  assert.equal(listed.length, 1)
  assert.equal(listed[0]?.kind, "catch_up")
  assert.equal(findMissedPoint(io, "auto_1", now - 60_000)?.kind, "scheduled")
})

test("7 天外的记录丢掉；独立键不叫 automations", () => {
  const week = 7 * 24 * 60 * 60 * 1000
  const now = 10 * week
  const kept = pruneMissedRecords(
    [
      {
        automationId: "a",
        scheduledAt: now - 1000,
        recordedAt: now,
        kind: "skipped",
        reason: "app_not_running"
      },
      {
        automationId: "a",
        scheduledAt: now - week - 60_000,
        recordedAt: now - week - 60_000,
        kind: "skipped",
        reason: "app_not_running"
      }
    ],
    now
  )
  assert.equal(kept.length, 1)
  assert.equal(MISSED_STORE_KEY, "automation_missed_local")
  assert.notEqual(MISSED_STORE_KEY, "automations")
})
