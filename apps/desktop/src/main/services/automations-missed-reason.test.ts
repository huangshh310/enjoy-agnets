import assert from "node:assert/strict"
import { test } from "node:test"
import { classifyMissedReason } from "./automations-missed-reason.ts"

const BASE = {
  scheduledAt: 1_000,
  lastAliveAt: 500,
  sessionStartedAt: 2_000,
  sleepWindows: [] as { start: number; end: number }[],
  runningWindows: [] as { start: number; end: number }[]
}

test("三原因：睡眠窗 / 应用未运行 / 上次仍在跑", () => {
  assert.equal(
    classifyMissedReason({
      ...BASE,
      trigger: "resume",
      sleepWindows: [{ start: 800, end: 1_500 }]
    }),
    "system_sleep"
  )
  assert.equal(classifyMissedReason({ ...BASE, trigger: "startup" }), "app_not_running")
  assert.equal(
    classifyMissedReason({
      ...BASE,
      trigger: "tick",
      currentlyRunning: true,
      lastAliveAt: 2_000,
      sessionStartedAt: 100
    }),
    "previous_still_running"
  )
})

test("睡眠窗优先于仍在跑", () => {
  assert.equal(
    classifyMissedReason({
      ...BASE,
      trigger: "tick",
      currentlyRunning: true,
      sleepWindows: [{ start: 900, end: 1_100 }],
      runningWindows: [{ start: 900, end: 1_100 }]
    }),
    "system_sleep"
  )
})
