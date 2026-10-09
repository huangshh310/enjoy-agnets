import assert from "node:assert/strict"
import { test } from "node:test"
import { reclassifyBlockedCatchUp } from "./automations-reclassify-catchup.ts"
import { claimMissedPoint, findMissedPoint, memorySettingsIo } from "./automations-missed-store.ts"

test("补跑撞上准点 running 改记 previous_still_running 跳过", () => {
  const io = memorySettingsIo()
  const now = Date.now()
  const scheduledAt = now
  claimMissedPoint(io, {
    automationId: "auto_busy",
    scheduledAt,
    recordedAt: now,
    kind: "catch_up",
    status: "running",
    isCatchUp: true
  })
  assert.equal(reclassifyBlockedCatchUp(io, "auto_busy", scheduledAt, now), true)
  const row = findMissedPoint(io, "auto_busy", scheduledAt)
  assert.equal(row?.kind, "skipped")
  assert.equal(row?.status, "skipped")
  assert.equal(row?.reason, "previous_still_running")
  assert.equal(row?.isCatchUp, false)
})
