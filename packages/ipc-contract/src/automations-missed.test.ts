import assert from "node:assert/strict"
import { test } from "node:test"
import { Automation } from "./automations.ts"
import {
  AutomationMissedRecord,
  AutomationRunSource,
  CATCH_UP_APPROVAL_TIMEOUT,
  CATCH_UP_APPROVAL_TIMEOUT_MS,
  CATCH_UP_INTERRUPTED_BY_RESTART,
  CATCH_UP_MAX_AGE_MS,
  ListAutomationMissedInput,
  ListAutomationMissedResult,
  MISSED_LOOKBACK_MS
} from "./automations-missed.ts"

test("错过记录只要跳过或补跑，7 天帽是常量", () => {
  assert.equal(MISSED_LOOKBACK_MS, 7 * 24 * 60 * 60 * 1000)
  assert.equal(CATCH_UP_MAX_AGE_MS, 24 * 60 * 60 * 1000)
  assert.equal(CATCH_UP_APPROVAL_TIMEOUT_MS, 30 * 60 * 1000)
  assert.equal(CATCH_UP_APPROVAL_TIMEOUT, "catch_up_approval_timeout")
  assert.equal(CATCH_UP_INTERRUPTED_BY_RESTART, "interrupted_by_restart")
  const skip = AutomationMissedRecord.safeParse({
    automationId: "auto_1",
    scheduledAt: 1,
    recordedAt: 2,
    kind: "skipped",
    reason: "system_sleep",
    status: "skipped",
    code: CATCH_UP_APPROVAL_TIMEOUT
  })
  assert.equal(skip.success, true)
  assert.equal(
    AutomationMissedRecord.safeParse({
      automationId: "auto_1",
      scheduledAt: 1,
      recordedAt: 2,
      kind: "skipped",
      code: "timeout"
    }).success,
    false
  )
  assert.equal(
    AutomationMissedRecord.safeParse({
      automationId: "auto_1",
      scheduledAt: 1,
      recordedAt: 2,
      kind: "scheduled"
    }).success,
    false
  )
})

test("补跑来源字段固定，多余键即拒", () => {
  const parsed = AutomationRunSource.safeParse({
    automationId: "auto_1",
    automationName: "晨间待办整理",
    scheduledAt: 1_700_000_000_000,
    isCatchUp: true
  })
  assert.equal(parsed.success, true)
  assert.equal(
    AutomationRunSource.safeParse({
      automationId: "auto_1",
      automationName: "晨间待办整理",
      scheduledAt: 1,
      isCatchUp: true,
      extra: true
    }).success,
    false
  )
})

test("list missed 只认 id；Automation 收下 skipped / 补跑开关", () => {
  assert.equal(ListAutomationMissedInput.safeParse({ id: "auto_1" }).success, true)
  assert.equal(ListAutomationMissedResult.safeParse({ records: [] }).success, true)
  const row = Automation.safeParse({
    id: "auto_1",
    name: "复盘",
    prompt: "对照 diff",
    trigger: "cron",
    enabled: true,
    updatedAt: 1,
    lastRunStatus: "skipped",
    lastSkipReason: "app_not_running",
    lastRunCatchUp: false,
    catchUpMissed: false
  })
  assert.equal(row.success, true)
})
