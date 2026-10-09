import assert from "node:assert/strict"
import { test } from "node:test"
import { CATCH_UP_INTERRUPTED_BY_RESTART } from "@enjoy-agents/ipc-contract/automations-missed"
import {
  failCatchUpWaiting,
  failInterruptedCatchUps,
  restoreWaitingCatchUpAction,
  shouldFailInterruptedCatchUp,
  shouldFailWaitingCatchUp
} from "./automations-catchup-orphans.ts"
import { claimMissedPoint, listMissedForAutomation, memorySettingsIo } from "./automations-missed-store.ts"

test("重启未续上的补跑 running 收成 interrupted_by_restart", () => {
  assert.equal(
    shouldFailInterruptedCatchUp({ kind: "catch_up", status: "running", runId: "r1" }, "running"),
    false
  )
  assert.equal(
    shouldFailInterruptedCatchUp({ kind: "catch_up", status: "running", runId: "r1" }, "waiting_review"),
    true
  )
  assert.equal(
    shouldFailInterruptedCatchUp({ kind: "catch_up", status: "running", runId: "r1" }, "cancelled"),
    true
  )
  assert.equal(shouldFailInterruptedCatchUp({ kind: "catch_up", status: "running" }, undefined), true)
  const io = memorySettingsIo()
  const now = Date.now()
  claimMissedPoint(io, {
    automationId: "auto_1",
    scheduledAt: now,
    recordedAt: now,
    kind: "catch_up",
    status: "running",
    runId: "run_dead",
    isCatchUp: true
  })
  const failed = failInterruptedCatchUps(io, (id) => (id === "run_dead" ? "cancelled" : undefined), now)
  assert.equal(failed[0]?.status, "failed")
  assert.equal(failed[0]?.code, CATCH_UP_INTERRUPTED_BY_RESTART)
  assert.equal(listMissedForAutomation(io, "auto_1", now)[0]?.code, CATCH_UP_INTERRUPTED_BY_RESTART)
})

test("重启恢复补跑 waiting 必须在有限时间内收尾", () => {
  assert.equal(
    restoreWaitingCatchUpAction({
      automationId: "auto_1",
      automationName: "晨间",
      scheduledAt: 1,
      isCatchUp: true
    }),
    "fail_interrupted"
  )
  assert.equal(restoreWaitingCatchUpAction({ isCatchUp: false }), "restore")
  assert.equal(shouldFailWaitingCatchUp({ isCatchUp: true }, true), false)
  assert.equal(shouldFailWaitingCatchUp({ isCatchUp: true }, false), true)
  assert.equal(shouldFailWaitingCatchUp({ isCatchUp: false }, false), false)
  const io = memorySettingsIo()
  const now = Date.now()
  claimMissedPoint(io, {
    automationId: "auto_wait",
    scheduledAt: now,
    recordedAt: now,
    kind: "catch_up",
    status: "running",
    runId: "run_wait",
    isCatchUp: true
  })
  claimMissedPoint(io, {
    automationId: "auto_other",
    scheduledAt: now + 60_000,
    recordedAt: now,
    kind: "catch_up",
    status: "running",
    runId: "run_live",
    isCatchUp: true
  })
  const failed = failCatchUpWaiting(io, "run_wait", now)
  assert.equal(failed.length, 1)
  assert.equal(failed[0]?.status, "failed")
  assert.equal(failed[0]?.code, CATCH_UP_INTERRUPTED_BY_RESTART)
  assert.equal(listMissedForAutomation(io, "auto_wait", now)[0]?.status, "failed")
  assert.equal(listMissedForAutomation(io, "auto_other", now)[0]?.status, "running")
})
