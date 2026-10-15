import assert from "node:assert/strict"
import { test } from "node:test"
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import {
  defaultProviderId,
  defaultProviderLabel,
  resolveDefaultProviderId
} from "./default-provider-label.ts"

const readiness = {
  defaultRoute: { runtimeId: "enjoy-local", profileId: "e2e" },
  apiKeys: [{ kind: "api_key", providerId: "e2e", presetId: "openai" }]
} as ChatReadiness

test("快照 id 在列表里时原样用", () => {
  const providers = [{ id: "e2e", name: "E2E Stub Key", active: true, hasKey: true }]
  assert.equal(resolveDefaultProviderId(readiness, providers), "e2e")
  assert.equal(defaultProviderLabel(readiness, providers, "当前供应商"), "E2E Stub Key")
})

test("快照 id 对不上时落到 active+hasKey 档案", () => {
  const providers = [{ id: "prv_1", name: "E2E Stub Key", active: true, hasKey: true, enabled: true }]
  assert.equal(defaultProviderId(readiness), "e2e")
  assert.equal(resolveDefaultProviderId(readiness, providers), "prv_1")
  assert.equal(defaultProviderLabel(readiness, providers, "当前供应商"), "E2E Stub Key")
})

test("没有有钥档案时走人话回落，不摊 id", () => {
  assert.equal(defaultProviderLabel(readiness, [], "当前供应商"), "当前供应商")
})

test("leo r3：快照档案已删（prv_gone）、另一份有钥但停用（prv_other）：解析不出，不打开错的档案", () => {
  const ghost = {
    defaultRoute: { runtimeId: "enjoy-local", profileId: "prv_gone" },
    apiKeys: [{ kind: "api_key", providerId: "prv_gone", presetId: "openai" }]
  } as ChatReadiness
  const providers = [{ id: "prv_other", name: "Other", active: false, hasKey: true, enabled: false }]
  assert.equal(resolveDefaultProviderId(ghost, providers), undefined)
  assert.equal(defaultProviderLabel(ghost, providers, "当前供应商"), "当前供应商")
})

test("leo r3：快照对不上、只有未在用的有钥档案（非 active）：也不猜", () => {
  const providers = [{ id: "prv_x", name: "X", active: false, hasKey: true, enabled: true }]
  assert.equal(resolveDefaultProviderId(readiness, providers), undefined)
})

test("leo r3：快照对不上、列表为空：不返回不存在的快照 id", () => {
  assert.equal(resolveDefaultProviderId(readiness, []), undefined)
})
