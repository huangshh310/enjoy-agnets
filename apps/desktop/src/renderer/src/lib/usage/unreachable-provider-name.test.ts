import assert from "node:assert/strict"
import { test } from "node:test"
import { unreachableProviderName } from "./unreachable-provider-name.ts"

const keys = [
  { kind: "api_key" as const, providerId: "prv_1", presetId: "openai" },
  { kind: "api_key" as const, providerId: "prv_2", presetId: "anthropic" }
]
const snap = (profileId?: string) =>
  ({ defaultRoute: { runtimeId: "enjoy-local", ...(profileId ? { profileId } : {}) }, engines: [], apiKeys: keys }) as never

test("路线档案 id 对上 apiKeys[].providerId（档案 id）：取该档案的预设名", () => {
  assert.equal(unreachableProviderName(snap("prv_2"), "fb"), "Anthropic")
})

test("路线指了档案但列表里没有：不拿别家档案顶名，回落通用名", () => {
  assert.equal(unreachableProviderName(snap("prv_gone"), "fb"), "fb")
})

test("路线没指档案：取第一份 Key 档案；没有快照回落通用名", () => {
  assert.equal(unreachableProviderName(snap(), "fb"), "OpenAI")
  assert.equal(unreachableProviderName(undefined, "fb"), "fb")
})
