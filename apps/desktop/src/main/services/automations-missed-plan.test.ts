/**
 * AUTO-P2 M1–M6 对照：检测、原因、只补最近一次、幂等、7 天帽。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { applyMissedActions } from "./automations-missed-apply.ts"
import { planMissedActions } from "./automations-missed-plan.ts"
import { reconcileMissedAutomations } from "./automations-missed-reconcile.ts"
import { listMissedForAutomation, memorySettingsIo, writeAliveState } from "./automations-missed-store.ts"

const TZ = "Asia/Shanghai"
/** 2026-10-09 10:00 CST */
const now = Date.parse("2026-10-09T02:00:00.000Z")
/** 2026-10-07 00:00 CST — 应用上次活着 */
const lastAlive = Date.parse("2026-10-07T16:00:00.000Z")

const BASE = {
  cronExpr: "0 8 * * *",
  timeZone: TZ,
  enabled: true,
  claimedSlots: [] as number[],
  now,
  sessionStartedAt: now,
  lastAliveAt: lastAlive,
  sleepWindows: [] as { start: number; end: number }[],
  runningWindows: [] as { start: number; end: number }[],
  triggerKind: "cron"
}

test("M1 睡过计划点：原因是电脑睡眠，补跑关则只记跳过", () => {
  const eight = Date.parse("2026-10-09T00:00:00.000Z")
  const actions = planMissedActions({
    ...BASE,
    trigger: "resume",
    lastAliveAt: Date.parse("2026-10-08T16:00:00.000Z"),
    sleepWindows: [{ start: Date.parse("2026-10-08T16:30:00.000Z"), end: now }],
    catchUpMissed: false
  })
  assert.ok(actions.some((row) => row.scheduledAt === eight && row.reason === "system_sleep"))
  assert.ok(actions.every((row) => row.type === "skip"))
})

test("M2 应用关闭是应用未运行；滴答时仍在跑是上次仍在运行", () => {
  const closed = planMissedActions({ ...BASE, trigger: "startup", catchUpMissed: false })
  assert.ok(closed.some((row) => row.reason === "app_not_running"))
  const busy = planMissedActions({
    ...BASE,
    trigger: "tick",
    currentlyRunning: true,
    runningWindows: [{ start: lastAlive, end: now }],
    catchUpMissed: false
  })
  assert.ok(busy.some((row) => row.reason === "previous_still_running"))
})

test("M3 补跑开：只补最近一个，较早点只记跳过", () => {
  const actions = planMissedActions({ ...BASE, trigger: "startup", catchUpMissed: true })
  const catchUps = actions.filter((row) => row.type === "catch_up")
  const skips = actions.filter((row) => row.type === "skip")
  assert.equal(catchUps.length, 1)
  assert.ok(skips.length >= 1)
  assert.ok((catchUps[0]?.scheduledAt ?? 0) > (skips.at(-1)?.scheduledAt ?? 0))
})

test("M4 启动+唤醒对同一点只占一条", () => {
  const io = memorySettingsIo()
  writeAliveState(io, { lastAliveAt: lastAlive, sleepWindows: [] })
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
  const first = reconcileMissedAutomations({
    trigger: "startup",
    now,
    sessionStartedAt: now,
    io,
    items: [item]
  })
  const second = reconcileMissedAutomations({
    trigger: "resume",
    now,
    sessionStartedAt: now,
    io,
    items: [item]
  })
  assert.ok((first[0]?.actions.length ?? 0) >= 1)
  assert.equal(second.length, 0)
  const applied = applyMissedActions(io, "auto_1", first[0]?.actions ?? [], now)
  assert.equal(applied.length, 0)
})

test("跳过落 skipped；补跑点带 catch_up 标", () => {
  const io = memorySettingsIo()
  const actions = planMissedActions({ ...BASE, trigger: "startup", catchUpMissed: true })
  const accepted = applyMissedActions(io, "auto_1", actions, now)
  assert.ok(accepted.some((row) => row.type === "catch_up"))
  const listed = listMissedForAutomation(io, "auto_1", now)
  assert.ok(listed.some((row) => row.kind === "skipped" && row.status === "skipped" && row.isCatchUp !== true))
  const catchUp = listed.find((row) => row.kind === "catch_up")
  assert.equal(catchUp?.isCatchUp, true)
  assert.equal(catchUp?.status, "running")
})

test("最近一次 23 小时内补跑；25 小时只记跳过；更早点仍跳过", () => {
  const freshSlot = Date.parse("2026-10-08T03:00:00.000Z")
  const olderFresh = Date.parse("2026-10-07T03:00:00.000Z")
  const fresh = planMissedActions({
    ...BASE,
    cronExpr: "0 11 * * *",
    lastAliveAt: Date.parse("2026-10-06T16:00:00.000Z"),
    trigger: "startup",
    catchUpMissed: true
  })
  assert.equal(now - freshSlot, 23 * 60 * 60 * 1000)
  assert.deepEqual(
    fresh.filter((row) => row.type === "catch_up").map((row) => row.scheduledAt),
    [freshSlot]
  )
  assert.ok(fresh.some((row) => row.type === "skip" && row.scheduledAt === olderFresh))

  const staleLatest = Date.parse("2026-10-08T01:00:00.000Z")
  const stale = planMissedActions({
    ...BASE,
    cronExpr: "0 9 7,8 10 *",
    lastAliveAt: Date.parse("2026-10-06T16:00:00.000Z"),
    trigger: "startup",
    catchUpMissed: true
  })
  assert.equal(now - staleLatest, 25 * 60 * 60 * 1000)
  assert.ok(stale.length >= 2)
  assert.ok(stale.every((row) => row.type === "skip"))
  assert.ok(stale.every((row) => row.reason === "app_not_running"))
  assert.equal(stale.at(-1)?.scheduledAt, staleLatest)
})

test("M6 回看不超过 7 天；没有 lastAlive 不编造历史", () => {
  const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000
  const capped = planMissedActions({
    ...BASE,
    trigger: "startup",
    lastAliveAt: tenDaysAgo,
    catchUpMissed: false
  })
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  assert.ok(capped.every((row) => row.scheduledAt >= weekAgo))
  const fresh = planMissedActions({
    ...BASE,
    trigger: "startup",
    lastAliveAt: 0,
    catchUpMissed: false
  })
  assert.deepEqual(fresh, [])
})
