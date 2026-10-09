import assert from "node:assert/strict"
import { test } from "node:test"
import {
  alignCronMinute,
  listCronPoints,
  scheduledAutomationCommandId
} from "./automations-cron-points.ts"

const TZ = "Asia/Shanghai"

test("同一分钟槽 commandId 稳定，启动与唤醒撞车也同键", () => {
  const a = scheduledAutomationCommandId("auto_1", Date.parse("2026-10-01T00:00:30.000Z"))
  const b = scheduledAutomationCommandId("auto_1", Date.parse("2026-10-01T00:00:59.000Z"))
  assert.equal(a, b)
  assert.equal(a, `auto:auto_1:${alignCronMinute(Date.parse("2026-10-01T00:00:00.000Z"))}`)
})

test("0 8 * * * 回看列出每天 08:00 上海槽", () => {
  const from = Date.parse("2026-10-01T00:00:00.000Z")
  const to = Date.parse("2026-10-03T00:00:00.000Z")
  const points = listCronPoints({ cronExpr: "0 8 * * *", timeZone: TZ, fromMs: from, toMs: to })
  assert.ok(points.length >= 2)
  for (const slot of points) {
    const hour = new Date(slot).toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" })
    const minute = new Date(slot).toLocaleString("en-US", { timeZone: TZ, minute: "numeric" })
    assert.equal(Number(hour), 8)
    assert.equal(Number(minute), 0)
  }
})

test("7 天帽：窗口外的点不出现", () => {
  const now = Date.parse("2026-10-09T00:00:00.000Z")
  const from = now - 7 * 24 * 60 * 60 * 1000
  const points = listCronPoints({
    cronExpr: "0 8 * * *",
    timeZone: TZ,
    fromMs: from,
    toMs: now
  })
  assert.ok(points.every((slot) => slot >= from && slot <= now))
  const older = listCronPoints({
    cronExpr: "0 8 * * *",
    timeZone: TZ,
    fromMs: from - 3 * 24 * 60 * 60 * 1000,
    toMs: from - 60_000
  })
  assert.ok(older.every((slot) => slot < from))
})
