import assert from "node:assert/strict"
import test from "node:test"
import { createObservationLedger, type Observation } from "./observation-ledger.ts"

function sample(id: string, createdAt: number): Observation {
  return {
    id,
    pid: 10,
    windowId: "w",
    appName: "Calculator",
    elements: [{ id: "e1", role: "button", name: "7", clickable: true }],
    createdAt,
    platform: "darwin"
  }
}

test("冻结期间墙钟超过 TTL，take 仍成功", () => {
  let now = 1_000
  const ledger = createObservationLedger({ now: () => now, ttlMs: 50 })
  ledger.put(sample("obs_a", 1_000))
  assert.equal(ledger.freeze("obs_a"), true)
  now = 1_200
  assert.equal(ledger.peek("obs_a")?.id, "obs_a")
  assert.ok((ledger.ageMs("obs_a") ?? 99) <= 50)
  assert.equal(ledger.take("obs_a").ok, true)
})

test("解冻后继续计时，超时即 stale", () => {
  let now = 1_000
  const ledger = createObservationLedger({ now: () => now, ttlMs: 50 })
  ledger.put(sample("obs_a", 1_000))
  ledger.freeze("obs_a")
  now = 1_400
  ledger.unfreeze("obs_a")
  now = 1_460
  const expired = ledger.take("obs_a")
  assert.equal(expired.ok, false)
  if (!expired.ok) assert.equal(expired.code, "stale_observation")
})

test("已消费的观察不能靠冻结复活", () => {
  let now = 1_000
  const ledger = createObservationLedger({ now: () => now, ttlMs: 50 })
  ledger.put(sample("obs_a", 1_000))
  assert.equal(ledger.take("obs_a").ok, true)
  assert.equal(ledger.freeze("obs_a"), false)
  now = 1_010
  assert.equal(ledger.take("obs_a").ok, false)
  assert.equal(ledger.peek("obs_a"), null)
})

test("空账本 take 是显式 stale_observation", () => {
  const ledger = createObservationLedger({ now: () => 1_000, ttlMs: 50 })
  const missing = ledger.take("obs_gone")
  assert.equal(missing.ok, false)
  if (!missing.ok) assert.equal(missing.code, "stale_observation")
  assert.equal(ledger.lookup("obs_gone"), null)
  assert.equal(ledger.freeze("obs_gone"), false)
})

test("discard 后不能再 take", () => {
  const ledger = createObservationLedger({ now: () => 1_000, ttlMs: 50 })
  ledger.put(sample("obs_a", 1_000))
  ledger.freeze("obs_a")
  ledger.discard("obs_a")
  assert.equal(ledger.take("obs_a").ok, false)
  assert.equal(ledger.freeze("obs_a"), false)
})
