import assert from "node:assert/strict"
import { test } from "node:test"
import { calculateQuotaPacing, DURATION_5_HOURS_MS } from "./quota-pacing.ts"

test("returns exhausted when quota is 100%", () => {
  const res = calculateQuotaPacing(100, DURATION_5_HOURS_MS)
  assert.equal(res.status, "exhausted")
  assert.equal(res.cushionPercent, 0)
})

test("returns safe when pace is comfortable", () => {
  // 5h window, 2.5h passed (50%), 20% used -> burn rate ~40% at reset -> safe with ~60% cushion
  const now = 10000000
  const resetsAt = now + 2.5 * 3600 * 1000
  const res = calculateQuotaPacing(20, DURATION_5_HOURS_MS, resetsAt, now)
  assert.equal(res.status, "safe")
  assert.equal(res.cushionPercent! > 50, true)
  assert.equal(res.evenPacePercent, 50)
})

test("到期预计约 90% 标 warning", () => {
  const now = 10_000_000
  const resetsAt = now + 2.5 * 3600 * 1000
  const res = calculateQuotaPacing(45, DURATION_5_HOURS_MS, resetsAt, now)
  assert.equal(res.evenPacePercent, 50)
  assert.equal(res.status, "warning")
})

test("returns danger when burning too fast", () => {
  // 5h window, 1h passed (20%), 80% used -> projected 400% -> danger
  const now = 10000000
  const resetsAt = now + 4 * 3600 * 1000
  const res = calculateQuotaPacing(80, DURATION_5_HOURS_MS, resetsAt, now)
  assert.equal(res.status, "danger")
  assert.equal(res.projectedRunOutAt != null, true)
  assert.equal(res.projectedRunOutAt! > now, true)
})
