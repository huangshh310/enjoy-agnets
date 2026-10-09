import assert from "node:assert/strict"
import { test } from "node:test"
import {
  Automation,
  AutomationsChangedEvent,
  automationHasTrigger,
  automationTriggerList,
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

test("持久化行可带 lastRunErrorCode / 补跑开关", () => {
  const parsed = Automation.safeParse({
    id: "auto_1",
    name: "复盘",
    prompt: "对照 diff",
    trigger: "cron",
    enabled: true,
    updatedAt: 1,
    lastRunAt: 2,
    lastRunStatus: "failed",
    lastRunErrorCode: "catch_up_approval_timeout",
    lastSkipReason: "system_sleep",
    lastRunCatchUp: true,
    catchUpMissed: true,
    lastSessionId: "ses_9"
  })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.lastRunStatus, "failed")
    assert.equal(parsed.data.lastRunErrorCode, "catch_up_approval_timeout")
    assert.equal(parsed.data.catchUpMissed, true)
    const unknown = Automation.safeParse({ ...parsed.data, lastRunErrorCode: "timeout" })
    assert.equal(unknown.success, true)
    if (unknown.success) assert.equal(unknown.data.lastRunErrorCode, undefined)
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

test("changed 事件只要 reason，含 missed", () => {
  assert.equal(AutomationsChangedEvent.safeParse({ reason: "status" }).success, true)
  assert.equal(AutomationsChangedEvent.safeParse({ reason: "missed" }).success, true)
  assert.equal(AutomationsChangedEvent.safeParse({ reason: "cloud" }).success, false)
})

test("upsert 收下 webhook 本机端口与可选密钥", () => {
  const parsed = UpsertAutomationInput.safeParse({
    name: "本地 hook 开一轮",
    prompt: "复盘",
    trigger: "webhook",
    webhookPort: 8765,
    webhookPath: "/hooks/enjoy",
    webhookSecret: "local-token",
    enabled: true
  })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.webhookPort, 8765)
    assert.equal(parsed.data.webhookPath, "/hooks/enjoy")
  }
})

test("徽章可并存：trigger + triggers 去重", () => {
  const item = { trigger: "on_save" as const, triggers: ["on_save", "webhook"] as const }
  assert.deepEqual(automationTriggerList(item), ["on_save", "webhook"])
  assert.equal(automationHasTrigger(item, "webhook"), true)
  assert.equal(automationHasTrigger({ trigger: "manual" }, "on_save"), false)
})

test("webhook 端口越界即拒，公网不是合法 trigger", () => {
  assert.equal(
    UpsertAutomationInput.safeParse({
      name: "坏端口",
      prompt: "x",
      trigger: "webhook",
      webhookPort: 70000,
      enabled: true
    }).success,
    false
  )
  assert.equal(
    UpsertAutomationInput.safeParse({
      name: "云",
      prompt: "x",
      trigger: "cloud",
      enabled: true
    }).success,
    false
  )
})
