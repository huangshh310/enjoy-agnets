import assert from "node:assert/strict"
import { test } from "node:test"
import { formatClock, parseCronPlain } from "./format-cron.ts"

test("每天 / 工作日 / 每周某天", () => {
  assert.deepEqual(parseCronPlain("0 8 * * *"), { kind: "daily", hour: 8, minute: 0 })
  assert.deepEqual(parseCronPlain("30 9 * * 1-5"), { kind: "weekdays", hour: 9, minute: 30 })
  assert.deepEqual(parseCronPlain("0 8 * * MON-FRI"), { kind: "weekdays", hour: 8, minute: 0 })
  assert.deepEqual(parseCronPlain("0 9 * * 1"), { kind: "weekly", hour: 9, minute: 0, dow: 1 })
  assert.deepEqual(parseCronPlain("15 18 * * 0"), { kind: "weekly", hour: 18, minute: 15, dow: 0 })
  assert.deepEqual(parseCronPlain("15 18 * * 7"), { kind: "weekly", hour: 18, minute: 15, dow: 0 })
})

test("每小时 / 每 N 分钟", () => {
  assert.deepEqual(parseCronPlain("0 * * * *"), { kind: "hourly" })
  assert.deepEqual(parseCronPlain("*/15 * * * *"), { kind: "everyMinutes", n: 15 })
  assert.deepEqual(parseCronPlain("*/5 * * * *"), { kind: "everyMinutes", n: 5 })
})

test("其余回落自定义", () => {
  assert.equal(parseCronPlain("0 8 1 * *").kind, "custom")
  assert.equal(parseCronPlain("0 8 * 1 *").kind, "custom")
  assert.equal(parseCronPlain("0 8 * * 1,3").kind, "custom")
  assert.equal(parseCronPlain("0 */2 * * *").kind, "custom")
  assert.equal(parseCronPlain("not-cron").kind, "custom")
})

test("时钟补零", () => {
  assert.equal(formatClock(8, 0), "08:00")
  assert.equal(formatClock(0, 5), "00:05")
})
