import assert from "node:assert/strict"
import { test } from "node:test"
import { cronMatches, parseCronExpr, shouldFireCron } from "./automations-cron.ts"
import { planHeartbeatTick } from "./session-heartbeat-plan.ts"

const TZ = "Asia/Shanghai"
/** 2026-09-21 09:00 CST（周一） */
const nine = new Date("2026-09-21T01:00:00.000Z")
/** 2026-09-21 10:00 CST */
const ten = new Date("2026-09-21T02:00:00.000Z")

test("解析 5 段 cron，拒绝少段", () => {
  assert.ok(parseCronExpr("0 9 * * *"))
  assert.equal(parseCronExpr("0 9 * *"), null)
  assert.equal(parseCronExpr("not-cron"), null)
})

test("0 9 * * * 只在上海 09:00 命中，10:00 不补跑", () => {
  assert.equal(cronMatches("0 9 * * *", nine, TZ), true)
  assert.equal(cronMatches("0 9 * * *", ten, TZ), false)
})

test("列表与步进", () => {
  assert.equal(cronMatches("0,30 9 * * *", new Date("2026-09-21T01:30:00.000Z"), TZ), true)
  assert.equal(cronMatches("*/15 9 * * *", new Date("2026-09-21T01:15:00.000Z"), TZ), true)
  assert.equal(cronMatches("*/15 9 * * *", new Date("2026-09-21T01:16:00.000Z"), TZ), false)
})

test("到点才开：关、跑着、同一分钟已开都不发", () => {
  const base = {
    enabled: true,
    trigger: "cron" as const,
    cronExpr: "0 9 * * *",
    timeZone: TZ,
    now: nine
  }
  assert.equal(shouldFireCron(base), true)
  assert.equal(shouldFireCron({ ...base, enabled: false }), false)
  assert.equal(shouldFireCron({ ...base, running: true }), false)
  assert.equal(shouldFireCron({ ...base, lastRunAt: nine.getTime() }), false)
})

test("并存触发含 cron 时仍到点才开", () => {
  assert.equal(
    shouldFireCron({
      enabled: true,
      trigger: "on_save",
      triggers: ["on_save", "cron"],
      cronExpr: "0 9 * * *",
      timeZone: TZ,
      now: nine
    }),
    true
  )
})

test("应用关闭错过 09:00，10:00 回来不补", () => {
  assert.equal(
    shouldFireCron({
      enabled: true,
      trigger: "cron",
      cronExpr: "0 9 * * *",
      timeZone: TZ,
      now: ten
    }),
    false
  )
})

test("心跳到点且忙碌则跳过，次数用尽则停", () => {
  assert.equal(
    planHeartbeatTick({
      enabled: true,
      cronExpr: "0 9 * * *",
      timeZone: TZ,
      runCount: 0,
      blocked: true,
      now: nine
    }),
    "skip"
  )
  assert.equal(
    planHeartbeatTick({
      enabled: true,
      cronExpr: "0 9 * * *",
      timeZone: TZ,
      runCount: 0,
      blocked: false,
      now: nine
    }),
    "fire"
  )
  assert.equal(
    planHeartbeatTick({
      enabled: true,
      cronExpr: "0 9 * * *",
      timeZone: TZ,
      runCount: 3,
      maxRuns: 3,
      blocked: false,
      now: nine
    }),
    "retire"
  )
})
