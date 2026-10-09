import assert from "node:assert/strict"
import { test } from "node:test"
import { clockValue, cronFromSchedule, parseClockValue, scheduleFromCron } from "./schedule-preset.ts"

test("常见 cron 回落每天 / 工作日 / 每周", () => {
  assert.deepEqual(scheduleFromCron("0 8 * * *").preset, "daily")
  assert.equal(scheduleFromCron("0 8 * * *").hour, 8)
  assert.equal(scheduleFromCron("30 9 * * 1-5").preset, "weekdays")
  assert.equal(scheduleFromCron("0 9 * * 1").preset, "weekly")
  assert.equal(scheduleFromCron("0 9 * * 1").dow, 1)
  assert.equal(scheduleFromCron("0 8 1 * *").preset, "advanced")
})

test("预设往返仍是同一条 cron", () => {
  const daily = scheduleFromCron("0 8 * * *")
  assert.equal(cronFromSchedule(daily), "0 8 * * *")
  const weekdays = scheduleFromCron("30 9 * * 1-5")
  assert.equal(cronFromSchedule({ ...weekdays, cronExpr: weekdays.cronExpr }), "30 9 * * 1-5")
  const weekly = scheduleFromCron("15 18 * * 0")
  assert.equal(cronFromSchedule(weekly), "15 18 * * 0")
})

test("改预设会写出新 cron，自定义保留原文", () => {
  assert.equal(cronFromSchedule({ preset: "daily", hour: 8, minute: 0, dow: 1 }), "0 8 * * *")
  assert.equal(cronFromSchedule({ preset: "weekdays", hour: 8, minute: 0, dow: 1 }), "0 8 * * 1-5")
  assert.equal(cronFromSchedule({ preset: "weekly", hour: 9, minute: 0, dow: 5 }), "0 9 * * 5")
  assert.equal(
    cronFromSchedule({ preset: "advanced", hour: 9, minute: 0, dow: 1, cronExpr: "*/15 * * * *" }),
    "*/15 * * * *"
  )
})

test("时钟输入往返", () => {
  assert.equal(clockValue(8, 0), "08:00")
  assert.deepEqual(parseClockValue("08:00"), { hour: 8, minute: 0 })
  assert.equal(parseClockValue("25:00"), null)
})
