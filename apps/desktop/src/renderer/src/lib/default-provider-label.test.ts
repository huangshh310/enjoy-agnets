import assert from "node:assert/strict"
import { test } from "node:test"
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import {
  defaultProviderId,
  defaultProviderFace,
  resolveDefaultProviderId
} from "./default-provider-label.ts"

const readiness = {
  defaultRoute: { runtimeId: "enjoy-local", profileId: "e2e" },
  apiKeys: [{ kind: "api_key", providerId: "e2e", presetId: "openai" }]
} as ChatReadiness

test("快照 id 在列表里时原样用", () => {
  const providers = [{ id: "e2e", name: "E2E Stub Key", kind: "openai", active: true, hasKey: true }]
  assert.equal(resolveDefaultProviderId(readiness, providers), "e2e")
  assert.deepEqual(defaultProviderFace(readiness, providers), { kind: "named", name: "OpenAI" }, "说供应商，不说档案名")
})

test("快照 id 对不上时落到 active+hasKey 档案", () => {
  const providers = [{ id: "prv_1", name: "Work key A", kind: "deepseek", active: true, hasKey: true, enabled: true }]
  assert.equal(defaultProviderId(readiness), "e2e")
  assert.equal(resolveDefaultProviderId(readiness, providers), "prv_1")
  assert.deepEqual(defaultProviderFace(readiness, providers), { kind: "named", name: "DeepSeek" })
})

test("没有有钥档案时走人话回落，不摊 id", () => {
  assert.deepEqual(defaultProviderFace(readiness, []), { kind: "generic" })
})

test("leo r3：快照档案已删（prv_gone）、另一份有钥但停用（prv_other）：解析不出，不打开错的档案", () => {
  const ghost = {
    defaultRoute: { runtimeId: "enjoy-local", profileId: "prv_gone" },
    apiKeys: [{ kind: "api_key", providerId: "prv_gone", presetId: "openai" }]
  } as ChatReadiness
  const providers = [{ id: "prv_other", name: "Other", active: false, hasKey: true, enabled: false }]
  assert.equal(resolveDefaultProviderId(ghost, providers), undefined)
  assert.deepEqual(defaultProviderFace(ghost, providers), { kind: "generic" })
})

test("leo r3：快照对不上、只有未在用的有钥档案（非 active）：也不猜", () => {
  const providers = [{ id: "prv_x", name: "X", active: false, hasKey: true, enabled: true }]
  assert.equal(resolveDefaultProviderId(readiness, providers), undefined)
})

test("leo r3：快照对不上、列表为空：不返回不存在的快照 id", () => {
  assert.equal(resolveDefaultProviderId(readiness, []), undefined)
})

test("luna #164 第 3 轮：自定义档案说档案名 → 主机名 → 通用；未知预设有地址说主机名；预设从不拿档案名 / 预设 id 顶", () => {
  const row = (extra: Record<string, unknown>) => [{ id: "e2e", name: "我的网关", active: true, hasKey: true, ...extra }]
  assert.deepEqual(defaultProviderFace(readiness, row({ kind: "custom", baseURL: "https://api.example.com/v1" })), { kind: "named", name: "我的网关" })
  assert.deepEqual(defaultProviderFace(readiness, row({ kind: "custom", name: " ", baseURL: "https://api.example.com/v1" })), { kind: "named", name: "api.example.com" })
  assert.deepEqual(defaultProviderFace(readiness, row({ kind: "mystery-preset", baseURL: "http://10.0.0.5:8080/v1" })), { kind: "named", name: "10.0.0.5" })
  assert.deepEqual(defaultProviderFace(readiness, row({ kind: "custom", baseURL: "not a url" })), { kind: "named", name: "我的网关" })
  assert.deepEqual(defaultProviderFace(readiness, row({ kind: "custom", name: "", baseURL: "not a url" })), { kind: "generic" })
  assert.deepEqual(defaultProviderFace(readiness, row({ kind: "mystery-preset" })), { kind: "generic" })
  assert.deepEqual(defaultProviderFace(readiness, row({})), { kind: "generic" })
  assert.deepEqual(defaultProviderFace(readiness, row({ kind: "openai", baseURL: "https://api.openai.com/v1" })), { kind: "named", name: "OpenAI" }, "已知预设 + 官方地址说品牌名")
  assert.deepEqual(defaultProviderFace(readiness, row({ kind: "openai", baseURL: "not a url" })), { kind: "generic" }, "预设地址填错不说档案名")
  // leo #164 S5：预设被改到别的地址 → 说那个地址的主机名，不说品牌
  assert.deepEqual(defaultProviderFace(readiness, row({ kind: "openai", baseURL: "https://proxy.example.com/v1" })), { kind: "named", name: "proxy.example.com" })
})
