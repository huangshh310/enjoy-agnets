import assert from "node:assert/strict"
import { test } from "node:test"
import {
  Automation,
  AutomationsChangedEvent,
  RunAutomationInput,
  UpsertAutomationInput
} from "./automations.ts"

test("run 允许只带 id，session 由 main 新开", () => {
  assert.equal(RunAutomationInput.safeParse({ id: "auto_1" }).success, true)
  assert.equal(
    RunAutomationInput.safeParse({ id: "auto_1", extra: true }).success,
    false
  )
})

test("run 仍接受旧的 sessionId + workspaceId", () => {
  assert.equal(
    RunAutomationInput.safeParse({
      id: "auto_1",
      sessionId: "ses_1",
      workspaceId: "ws_1"
    }).success,
    true
  )
})

test("upsert 收下 cron / 引擎 / 探索内部 mode", () => {
  const parsed = UpsertAutomationInput.safeParse({
    name: "晨间类型检查",
    prompt: "跑类型检查",
    trigger: "cron",
    cronExpr: "0 9 * * *",
    timeZone: "Asia/Shanghai",
    runtimeId: "claude",
    modelId: "sonnet",
    mode: "plan",
    enabled: true
  })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.cronExpr, "0 9 * * *")
    assert.equal(parsed.data.runtimeId, "claude")
    assert.equal(parsed.data.mode, "plan")
  }
})

test("持久化行可带 lastRunStatus / lastSessionId", () => {
  const parsed = Automation.safeParse({
    id: "auto_1",
    name: "复盘",
    prompt: "对照 diff",
    trigger: "manual",
    enabled: true,
    updatedAt: 1,
    lastRunAt: 2,
    lastRunStatus: "failed",
    lastSessionId: "ses_9"
  })
  assert.equal(parsed.success, true)
})

test("changed 事件只要 reason", () => {
  assert.equal(AutomationsChangedEvent.safeParse({ reason: "status" }).success, true)
  assert.equal(AutomationsChangedEvent.safeParse({ reason: "cloud" }).success, false)
})
