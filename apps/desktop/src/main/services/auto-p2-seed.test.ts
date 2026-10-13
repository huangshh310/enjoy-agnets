import assert from "node:assert/strict"
import { test } from "node:test"
import { buildAutoP2Fixture, isDevAutoP2SeedAllowed } from "./auto-p2-seed.ts"

test("开发夹具只在未打包且隔离 userData 时开", () => {
  assert.equal(isDevAutoP2SeedAllowed({ flag: true, packaged: false, isolatedUserData: true }), true)
  assert.equal(isDevAutoP2SeedAllowed({ flag: true, packaged: true, isolatedUserData: true }), false)
  assert.equal(isDevAutoP2SeedAllowed({ flag: true, packaged: false, isolatedUserData: false }), false)
  assert.equal(isDevAutoP2SeedAllowed({ flag: false, packaged: false, isolatedUserData: true }), false)
})

test("复检 extras 含忙、混因、重启打断，不丢 e2e 行", () => {
  const { automations, records } = buildAutoP2Fixture(Date.UTC(2026, 9, 9, 12), true)
  const names = automations.map((row) => row.name)
  assert.deepEqual(names, [
    "晨间待办整理",
    "晚间日志归档",
    "午间改动复盘",
    "补跑超时示例",
    "忙时跳过示例",
    "混因错过示例",
    "补跑重启打断示例"
  ])
  const mixed = records.filter((row) => row.automationId === "auto_mixed")
  assert.equal(mixed.length, 3)
  assert.deepEqual(
    mixed.map((row) => row.reason),
    ["app_not_running", "system_sleep", "previous_still_running"]
  )
  const interrupt = records.find((row) => row.automationId === "auto_interrupt")
  assert.equal(interrupt?.code, "interrupted_by_restart")
})

test("jojo P3：任何时刻种夹具，上次运行时间都不晚于现在（含早上 7 点 / 10:15 / 晚上）", async () => {
  const { buildAutoP2Fixture: build } = await import("./auto-p2-seed.ts")
  for (const hh of [0, 7, 9, 10.25, 12, 21.3, 23.9]) {
    const d = new Date(2026, 9, 13, 0, 0, 0, 0)
    const now = d.getTime() + hh * 3_600_000
    const fixture = build(now, true) as unknown as Record<string, unknown>
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) return v.forEach(walk)
      if (!v || typeof v !== "object") return
      for (const [k, x] of Object.entries(v)) {
        if ((k === "lastRunAt" || k === "scheduledAt" || k === "recordedAt") && typeof x === "number") {
          assert.ok(x <= now, `${k} ${new Date(x).toString()} > now ${new Date(now).toString()}`)
        } else walk(x)
      }
    }
    walk(fixture)
  }
})

test("catchUpAt 语义锁定：补跑记在「计划时刻 + 5 分钟」，但不超过现在", async () => {
  const { catchUpAt } = await import("./auto-p2-seed.ts")
  const slot = Date.UTC(2026, 9, 13, 2, 30)
  assert.equal(catchUpAt(slot, slot + 60 * 60_000), slot + 5 * 60_000)
  assert.equal(catchUpAt(slot, slot + 2 * 60_000), slot + 2 * 60_000)
  assert.equal(catchUpAt(slot, slot + 5 * 60_000), slot + 5 * 60_000)
})
