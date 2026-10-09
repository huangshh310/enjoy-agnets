import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CATCH_UP_APPROVAL_TIMEOUT,
  CATCH_UP_APPROVAL_TIMEOUT_MS,
  CATCH_UP_INTERRUPTED_BY_RESTART
} from "@enjoy-agents/ipc-contract/automations-missed"
import { catchUpApprovalTimedOut } from "./automations-catchup-timer.ts"
import { applyMissedActions } from "./automations-missed-apply.ts"
import { lastRunErrorCodeOf, nextConsecutiveFails, skippedRunPatch } from "./automations-fails.ts"
import { listMissedForAutomation, memorySettingsIo } from "./automations-missed-store.ts"

test("默认 30 分钟超时，到点记 failed + 稳定码", () => {
  assert.equal(CATCH_UP_APPROVAL_TIMEOUT_MS, 30 * 60 * 1000)
  assert.equal(catchUpApprovalTimedOut(0, CATCH_UP_APPROVAL_TIMEOUT_MS), true)
  assert.equal(catchUpApprovalTimedOut(0, CATCH_UP_APPROVAL_TIMEOUT_MS - 1), false)
  assert.equal(CATCH_UP_APPROVAL_TIMEOUT, "catch_up_approval_timeout")
})

test("跳过保持原有连续失败计数", () => {
  const io = memorySettingsIo()
  const now = Date.now()
  const accepted = applyMissedActions(
    io,
    "auto_skip",
    [{ type: "skip", scheduledAt: now, reason: "system_sleep" }],
    now
  )
  assert.equal(accepted.length, 1)
  const row = listMissedForAutomation(io, "auto_skip", now)[0]
  assert.equal(row?.status, "skipped")
  assert.equal(row?.kind, "skipped")
  const stamp = skippedRunPatch({ consecutiveFails: 2 })
  assert.equal(stamp.consecutiveFails, 2)
  assert.equal(stamp.lastRunStatus, "skipped")
  assert.equal(stamp.lastRunErrorCode, undefined)
  assert.equal(nextConsecutiveFails(2, "skipped"), 2)
  assert.equal(nextConsecutiveFails(2, "ok"), 0)
  assert.equal(nextConsecutiveFails(2, "failed"), 3)
})

test("列表读 lastRunErrorCode，超时不是普通失败文案", () => {
  assert.equal(lastRunErrorCodeOf("failed", CATCH_UP_APPROVAL_TIMEOUT), CATCH_UP_APPROVAL_TIMEOUT)
  assert.equal(
    lastRunErrorCodeOf("failed", CATCH_UP_INTERRUPTED_BY_RESTART),
    CATCH_UP_INTERRUPTED_BY_RESTART
  )
  assert.equal(lastRunErrorCodeOf("failed", "Automation failed."), undefined)
  assert.equal(lastRunErrorCodeOf("ok", CATCH_UP_APPROVAL_TIMEOUT), undefined)
})
