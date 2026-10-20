import assert from "node:assert/strict"
import { test } from "node:test"
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import {
  defaultProviderId,
  defaultProviderBrand,
  resolveDefaultProviderId
} from "./default-provider-label.ts"

const readiness = {
  defaultRoute: { runtimeId: "enjoy-local", profileId: "e2e" },
  apiKeys: [{ kind: "api_key", providerId: "e2e", presetId: "openai" }]
} as ChatReadiness

test("快照 id 在列表里时原样用", () => {
  const providers = [{ id: "e2e", name: "E2E Stub Key", kind: "openai", active: true, hasKey: true }]
  assert.equal(resolveDefaultProviderId(readiness, providers), "e2e")
  assert.equal(defaultProviderBrand(readiness, providers, "当前供应商"), "OpenAI", "说供应商，不说档案名")
})

test("快照 id 对不上时落到 active+hasKey 档案", () => {
  const providers = [{ id: "prv_1", name: "Work key A", kind: "deepseek", active: true, hasKey: true, enabled: true }]
  assert.equal(defaultProviderId(readiness), "e2e")
  assert.equal(resolveDefaultProviderId(readiness, providers), "prv_1")
  assert.equal(defaultProviderBrand(readiness, providers, "当前供应商"), "DeepSeek")
})

test("没有有钥档案时走人话回落，不摊 id", () => {
  assert.equal(defaultProviderBrand(readiness, [], "当前供应商"), "当前供应商")
})

test("leo r3：快照档案已删（prv_gone）、另一份有钥但停用（prv_other）：解析不出，不打开错的档案", () => {
  const ghost = {
    defaultRoute: { runtimeId: "enjoy-local", profileId: "prv_gone" },
    apiKeys: [{ kind: "api_key", providerId: "prv_gone", presetId: "openai" }]
  } as ChatReadiness
  const providers = [{ id: "prv_other", name: "Other", active: false, hasKey: true, enabled: false }]
  assert.equal(resolveDefaultProviderId(ghost, providers), undefined)
  assert.equal(defaultProviderBrand(ghost, providers, "当前供应商"), "当前供应商")
})

test("leo r3：快照对不上、只有未在用的有钥档案（非 active）：也不猜", () => {
  const providers = [{ id: "prv_x", name: "X", active: false, hasKey: true, enabled: true }]
  assert.equal(resolveDefaultProviderId(readiness, providers), undefined)
})

test("leo r3：快照对不上、列表为空：不返回不存在的快照 id", () => {
  assert.equal(resolveDefaultProviderId(readiness, []), undefined)
})

test("luna P2 定稿：自定义端点没有品牌名 → 用「当前供应商」，也不拿档案名顶；kind 缺省同样", () => {
  const custom = [{ id: "e2e", name: "我的网关", kind: "custom", active: true, hasKey: true }]
  assert.equal(defaultProviderBrand(readiness, custom, "当前供应商"), "当前供应商")
  const noKind = [{ id: "e2e", name: "Work key A", active: true, hasKey: true }]
  assert.equal(defaultProviderBrand(readiness, noKind, "当前供应商"), "当前供应商")
  const unknown = [{ id: "e2e", name: "Work key A", kind: "mystery-preset", active: true, hasKey: true }]
  assert.equal(defaultProviderBrand(readiness, unknown, "当前供应商"), "当前供应商")
})
