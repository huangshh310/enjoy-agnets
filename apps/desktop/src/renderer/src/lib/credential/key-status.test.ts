/**
 * 密钥三态：红只给 invalid；没校验 / 网络 / 403 都中性。向导行取最好的一把。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { guideKeyStatus, keyStatusOf, presetDisplayName } from "./key-status.ts"

const key = (providerId: string, presetId = "openai") => ({ kind: "api_key" as const, providerId, presetId })

test("keyStatusOf：invalid 才红，缺省 / network 中性", () => {
  assert.equal(keyStatusOf({ state: "invalid" }), "invalid")
  assert.equal(keyStatusOf({ state: "ok" }), "ok")
  assert.equal(keyStatusOf({ state: "unverified" }), "unverified")
  assert.equal(keyStatusOf(undefined), "unverified")
})

test("presetDisplayName：openai → OpenAI；自定义回落档案名", () => {
  assert.equal(presetDisplayName("openai", "x"), "OpenAI")
  assert.equal(presetDisplayName("custom", "My Gateway"), "My Gateway")
})

test("唯一一把被拒：向导行是 invalid，带档案 id 和显示名", () => {
  const readiness = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [key("p1")],
    engineCount: 1,
    hasEnjoySecret: true,
    activeKeyProfileId: "p1",
    credentialCheck: { state: "invalid", code: "auth_rejected" }
  })
  assert.equal(readiness.ready, false)
  assert.deepEqual(guideKeyStatus(readiness), { status: "invalid", profileId: "p1", providerName: "OpenAI" })
})

test("unverified:network 中性，不当 invalid", () => {
  const readiness = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [key("p1")],
    engineCount: 1,
    hasEnjoySecret: true,
    activeKeyProfileId: "p1",
    credentialCheck: { state: "unverified", code: "network" }
  })
  assert.equal(guideKeyStatus(readiness)?.status, "unverified")
})

test("多把里有一把能用就不红；全被拒才红", () => {
  const providers = [
    { id: "p1", kind: "openai", credentialCheck: { state: "invalid" as const } },
    { id: "p2", kind: "anthropic", credentialCheck: { state: "ok" as const } }
  ]
  const snap = { apiKeys: [key("p1"), key("p2", "anthropic")], defaultRoute: undefined, credentialCheck: undefined }
  assert.deepEqual(guideKeyStatus(snap, providers), { status: "ok", profileId: "p2", providerName: "Anthropic" })
  const allBad = providers.map((row) => ({ ...row, credentialCheck: { state: "invalid" as const } }))
  assert.equal(guideKeyStatus(snap, allBad)?.status, "invalid")
})

test("没有密钥：没有三态", () => {
  assert.equal(guideKeyStatus(undefined), undefined)
})
