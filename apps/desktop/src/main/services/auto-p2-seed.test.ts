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
    "午间 diff 复盘",
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
