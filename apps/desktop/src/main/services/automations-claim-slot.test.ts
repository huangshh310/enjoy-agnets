import assert from "node:assert/strict"
import { test } from "node:test"
import { claimLaunchSlot } from "./automations-claim-slot.ts"
import { claimMissedPoint, memorySettingsIo } from "./automations-missed-store.ts"

test("准点与补跑互斥：已占槽不能再开另一种", () => {
  const io = memorySettingsIo()
  const now = Date.now()
  assert.equal(claimLaunchSlot(io, "auto_1", { scheduledAt: now, isCatchUp: false }), true)
  assert.equal(claimLaunchSlot(io, "auto_1", { scheduledAt: now, isCatchUp: true }), false)
  const other = memorySettingsIo()
  claimMissedPoint(other, {
    automationId: "auto_2",
    scheduledAt: now,
    recordedAt: now,
    kind: "catch_up",
    status: "running",
    isCatchUp: true
  })
  assert.equal(claimLaunchSlot(other, "auto_2", { scheduledAt: now, isCatchUp: true }), true)
  assert.equal(claimLaunchSlot(other, "auto_2", { scheduledAt: now, isCatchUp: false }), false)
})

test("同一计划点并发 claim 只有一个成功", async () => {
  const io = memorySettingsIo()
  const now = Date.now()
  const opts = { scheduledAt: now, isCatchUp: false as const }
  const results = await Promise.all([
    Promise.resolve().then(() => claimLaunchSlot(io, "auto_race", opts)),
    Promise.resolve().then(() => claimLaunchSlot(io, "auto_race", opts)),
    Promise.resolve().then(() => claimLaunchSlot(io, "auto_race", opts))
  ])
  assert.equal(results.filter(Boolean).length, 1)
})
