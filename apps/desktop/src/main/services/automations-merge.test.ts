import assert from "node:assert/strict"
import { test } from "node:test"
import { mergeAutomation } from "./automations-merge.ts"

const existing = {
  id: "auto_1",
  name: "晨间类型检查",
  prompt: "跑类型检查",
  trigger: "cron",
  cronExpr: "0 9 * * *",
  timeZone: "Asia/Shanghai",
  runtimeId: "claude",
  modelId: "sonnet",
  mode: "agent",
  lastRunAt: 100,
  lastRunStatus: "failed",
  lastRunErrorCode: "catch_up_approval_timeout",
  lastSessionId: "ses_1",
  enabled: true,
  updatedAt: 1
} as const

test("开关只改 enabled，保留 cron 与上次运行", () => {
  const next = mergeAutomation(
    existing,
    {
      name: existing.name,
      prompt: existing.prompt,
      trigger: existing.trigger,
      enabled: false
    },
    existing.id,
    200
  )
  assert.equal(next.enabled, false)
  assert.equal(next.cronExpr, "0 9 * * *")
  assert.equal(next.runtimeId, "claude")
  assert.equal(next.lastRunAt, 100)
  assert.equal(next.lastRunStatus, "failed")
  assert.equal(next.lastRunErrorCode, "catch_up_approval_timeout")
  assert.equal(next.catchUpMissed, false)
  assert.equal(next.updatedAt, 200)
})

test("补跑开关默认关，upsert 可打开", () => {
  const next = mergeAutomation(
    existing,
    {
      name: existing.name,
      prompt: existing.prompt,
      trigger: existing.trigger,
      catchUpMissed: true,
      enabled: true
    },
    existing.id,
    200
  )
  assert.equal(next.catchUpMissed, true)
})

test("新建默认执行 mode", () => {
  const next = mergeAutomation(
    undefined,
    { name: "复盘", prompt: "看 diff", trigger: "manual", enabled: true },
    "auto_2",
    3
  )
  assert.equal(next.mode, "agent")
  assert.equal(next.trigger, "manual")
})

test("开关保留 webhook 端口与密钥", () => {
  const webhook = {
    ...existing,
    trigger: "webhook" as const,
    webhookPort: 8765,
    webhookPath: "/hooks/enjoy",
    webhookSecret: "local-token"
  }
  const next = mergeAutomation(
    webhook,
    {
      name: webhook.name,
      prompt: webhook.prompt,
      trigger: webhook.trigger,
      enabled: false
    },
    webhook.id,
    200
  )
  assert.equal(next.webhookPort, 8765)
  assert.equal(next.webhookPath, "/hooks/enjoy")
  assert.equal(next.webhookSecret, "local-token")
})
