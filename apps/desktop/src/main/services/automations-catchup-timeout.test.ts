import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CATCH_UP_APPROVAL_TIMEOUT,
  CATCH_UP_APPROVAL_TIMEOUT_MS
} from "@enjoy-agents/ipc-contract/automations-missed"
import { catchUpApprovalTimedOut } from "./automations-catchup-timer.ts"
import { lastRunErrorCodeOf, nextConsecutiveFails } from "./automations-fails.ts"

test("默认 30 分钟超时，到点记 failed + 稳定码", () => {
  assert.equal(CATCH_UP_APPROVAL_TIMEOUT_MS, 30 * 60 * 1000)
  assert.equal(catchUpApprovalTimedOut(0, CATCH_UP_APPROVAL_TIMEOUT_MS), true)
  assert.equal(catchUpApprovalTimedOut(0, CATCH_UP_APPROVAL_TIMEOUT_MS - 1), false)
  assert.equal(CATCH_UP_APPROVAL_TIMEOUT, "catch_up_approval_timeout")
})

test("跳过不算失败次数", () => {
  assert.equal(nextConsecutiveFails(2, "skipped"), 0)
  assert.equal(nextConsecutiveFails(2, "ok"), 0)
  assert.equal(nextConsecutiveFails(2, "failed"), 3)
})

test("列表读 lastRunErrorCode，超时不是普通失败文案", () => {
  assert.equal(lastRunErrorCodeOf("failed", CATCH_UP_APPROVAL_TIMEOUT), CATCH_UP_APPROVAL_TIMEOUT)
  assert.equal(lastRunErrorCodeOf("failed", "Automation failed."), undefined)
  assert.equal(lastRunErrorCodeOf("ok", CATCH_UP_APPROVAL_TIMEOUT), undefined)
})
