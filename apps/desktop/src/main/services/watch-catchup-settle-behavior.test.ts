/**
 * 续跑补跑收尾走生产 finish；成功后再次启动不得改成 interrupted_by_restart。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CATCH_UP_APPROVAL_TIMEOUT,
  CATCH_UP_INTERRUPTED_BY_RESTART
} from "@enjoy-agents/ipc-contract/automations-missed"

const {
  settleRun,
  waitForRunSettle,
  deleteSetting,
  getSetting,
  setSetting,
  failInterruptedCatchUps,
  claimMissedPoint,
  defaultSettingsIo,
  listMissedForAutomation,
  readAutomations,
  writeAutomations,
  stampUnrestoredCatchUp,
  watchCatchUpSettle
} = await import("./watch-catchup-settle-behavior.load.ts")

function seedAutomation(id: string): string | undefined {
  const prev = getSetting("automations")
  writeAutomations([
    {
      id,
      name: "晨间",
      prompt: "x",
      trigger: "cron",
      enabled: true,
      updatedAt: 1
    }
  ])
  return prev
}

function restoreAutomations(prev: string | undefined): void {
  if (prev === undefined) deleteSetting("automations")
  else setSetting("automations", prev)
}

function seedCatchUpMissed(automationId: string, runId: string, scheduledAt: number): void {
  claimMissedPoint(defaultSettingsIo(), {
    automationId,
    scheduledAt,
    recordedAt: scheduledAt,
    kind: "catch_up",
    status: "running",
    runId,
    isCatchUp: true
  })
}

test("续跑补跑成功后错过记录终态，再次启动不标 interrupted_by_restart", async () => {
  const automationId = "auto_restore_ok"
  const runId = "run_restore_ok"
  const scheduledAt = Date.now()
  const prev = seedAutomation(automationId)
  seedCatchUpMissed(automationId, runId, scheduledAt)
  try {
    const watching = watchCatchUpSettle(automationId, runId, { scheduledAt })
    settleRun(runId, { status: "end", summary: "done" })
    await watching
    const missed = listMissedForAutomation(defaultSettingsIo(), automationId, scheduledAt)[0]
    assert.equal(missed?.status, "ok")
    assert.equal(missed?.code, undefined)
    assert.equal(readAutomations().find((item) => item.id === automationId)?.lastRunStatus, "ok")
    const interrupted = failInterruptedCatchUps(defaultSettingsIo(), () => "cancelled", scheduledAt)
    assert.ok(!interrupted.some((row) => row.automationId === automationId))
    assert.equal(
      listMissedForAutomation(defaultSettingsIo(), automationId, scheduledAt)[0]?.status,
      "ok"
    )
    assert.equal(
      listMissedForAutomation(defaultSettingsIo(), automationId, scheduledAt)[0]?.code,
      undefined
    )
  } finally {
    restoreAutomations(prev)
  }
})

test("续跑补跑失败写 failed，码也正确", async () => {
  const automationId = "auto_restore_fail"
  const runId = "run_restore_fail"
  const scheduledAt = Date.now()
  const prev = seedAutomation(automationId)
  seedCatchUpMissed(automationId, runId, scheduledAt)
  try {
    const watching = watchCatchUpSettle(automationId, runId, { scheduledAt })
    settleRun(runId, { status: "error", summary: CATCH_UP_APPROVAL_TIMEOUT })
    await watching
    const row = readAutomations().find((item) => item.id === automationId)
    const missed = listMissedForAutomation(defaultSettingsIo(), automationId, scheduledAt)[0]
    assert.equal(row?.lastRunStatus, "failed")
    assert.equal(row?.lastRunErrorCode, CATCH_UP_APPROVAL_TIMEOUT)
    assert.equal(missed?.status, "failed")
    assert.equal(missed?.code, CATCH_UP_APPROVAL_TIMEOUT)
    assert.equal((await waitForRunSettle(runId)).summary, CATCH_UP_APPROVAL_TIMEOUT)
  } finally {
    restoreAutomations(prev)
  }
})

test("没续上的补跑才标 interrupted_by_restart", () => {
  const automationId = "auto_restore_miss"
  const runId = "run_restore_miss"
  const scheduledAt = Date.now()
  const prev = seedAutomation(automationId)
  seedCatchUpMissed(automationId, runId, scheduledAt)
  try {
    stampUnrestoredCatchUp(runId, {
      automationId,
      automationName: "晨间",
      scheduledAt,
      isCatchUp: true
    })
    const missed = listMissedForAutomation(defaultSettingsIo(), automationId, scheduledAt)[0]
    assert.equal(missed?.status, "failed")
    assert.equal(missed?.code, CATCH_UP_INTERRUPTED_BY_RESTART)
    assert.equal(
      readAutomations().find((item) => item.id === automationId)?.lastRunErrorCode,
      CATCH_UP_INTERRUPTED_BY_RESTART
    )
  } finally {
    restoreAutomations(prev)
  }
})
