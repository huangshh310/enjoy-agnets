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
