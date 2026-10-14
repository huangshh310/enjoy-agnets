/**
 * 密钥三态：红只给 invalid；没校验 / 网络 / 403 都中性。向导行取最好的一把。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { activeProviderDotClass, credentialCheckChanged, guideKeyStatus, providerKeyView, keyBadgeTone, keyStatusOf, presetDisplayName, profileKeyStatus } from "./key-status.ts"

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

test("没有默认路线档案：多把里有一把能用就不红；全被拒才红", () => {
  const providers = [
    { id: "p1", kind: "openai", credentialCheck: { state: "invalid" as const } },
    { id: "p2", kind: "anthropic", credentialCheck: { state: "ok" as const } }
  ]
  const snap = { apiKeys: [key("p1"), key("p2", "anthropic")], defaultRoute: undefined, credentialCheck: undefined }
  assert.deepEqual(guideKeyStatus(snap, providers), { status: "ok", profileId: "p2", providerName: "Anthropic" })
  const allBad = providers.map((row) => ({ ...row, credentialCheck: { state: "invalid" as const } }))
  assert.equal(guideKeyStatus(snap, allBad)?.status, "invalid")
})

test("有默认路线档案：以那份为准；默认那把被拒、另一把 ok 仍是红（和 ready 一致，不绕圈）", () => {
  const providers = [
    { id: "p1", kind: "openai", credentialCheck: { state: "invalid" as const } },
    { id: "p2", kind: "anthropic", credentialCheck: { state: "ok" as const } }
  ]
  const snap = {
    apiKeys: [key("p1"), key("p2", "anthropic")],
    defaultRoute: { runtimeId: "enjoy-local", profileId: "p1" },
    credentialCheck: { state: "invalid" as const, code: "auth_rejected" as const }
  }
  assert.deepEqual(guideKeyStatus(snap, providers), { status: "invalid", profileId: "p1", providerName: "OpenAI" })
  const okRoute = { ...snap, defaultRoute: { runtimeId: "enjoy-local", profileId: "p2" }, credentialCheck: { state: "ok" as const } }
  assert.deepEqual(guideKeyStatus(okRoute, providers), { status: "ok", profileId: "p2", providerName: "Anthropic" })
})

test("keyBadgeTone：只有 invalid 是红，ok 绿，其余中性", () => {
  assert.equal(keyBadgeTone("ok"), "success")
  assert.equal(keyBadgeTone("invalid"), "error")
  assert.equal(keyBadgeTone("unverified"), "neutral")
})

test("profileKeyStatus：设置行按存下的校验结果三态，不把有密钥当已验证", () => {
  const base = { requiresKey: true, hasKey: true }
  assert.equal(profileKeyStatus({ ...base, credentialCheck: { state: "invalid" } }), "invalid")
  assert.equal(profileKeyStatus({ ...base, credentialCheck: { state: "unverified" } }), "unverified")
  assert.equal(profileKeyStatus(base), "unverified")
  assert.equal(profileKeyStatus({ ...base, credentialCheck: { state: "ok" } }), "ok")
  assert.equal(profileKeyStatus({ requiresKey: true, hasKey: false }), undefined)
  assert.equal(profileKeyStatus({ requiresKey: false, hasKey: true }), undefined)
})

test("没有密钥：没有三态", () => {
  assert.equal(guideKeyStatus(undefined), undefined)
})

test("credentialCheckChanged：state / code / checkedAt 变了才算变", () => {
  const at = (state: "ok" | "invalid" | "unverified", checkedAt?: string, code?: "network") => ({
    credentialCheck: { state, ...(checkedAt ? { checkedAt } : {}), ...(code ? { code } : {}) }
  })
  assert.equal(credentialCheckChanged(undefined, at("ok")), true)
  assert.equal(credentialCheckChanged(at("ok", "t1"), at("ok", "t1")), false)
  assert.equal(credentialCheckChanged(at("unverified", "t1"), at("invalid", "t1")), true)
  assert.equal(credentialCheckChanged(at("unverified", "t1"), at("unverified", "t1", "network")), true)
  assert.equal(credentialCheckChanged(at("ok", "t1"), at("ok", "t2")), true)
  assert.equal(credentialCheckChanged({ credentialCheck: undefined }, { credentialCheck: undefined }), false)
})

const ghostReadiness = (keys: ReturnType<typeof key>[]) => ({
  apiKeys: keys,
  defaultRoute: { runtimeId: "enjoy-local", profileId: "ghost" },
  credentialCheck: { state: "invalid" as const, code: "auth_rejected" as const }
})

test("ghost 路线 + 只有一把 p2 ok：invalid，但不记在 p2 名下（改密钥走新建）", () => {
  const providers = [{ id: "p2", kind: "anthropic", credentialCheck: { state: "ok" as const } }]
  assert.deepEqual(guideKeyStatus(ghostReadiness([key("p2", "anthropic")]), providers), { status: "invalid" })
})

test("ghost 路线 + 两把（p1 被拒、p2 ok）：不回落取最好，仍 invalid 且不绑定档案", () => {
  const providers = [
    { id: "p1", kind: "openai", credentialCheck: { state: "invalid" as const } },
    { id: "p2", kind: "anthropic", credentialCheck: { state: "ok" as const } }
  ]
  assert.deepEqual(guideKeyStatus(ghostReadiness([key("p1"), key("p2", "anthropic")]), providers), { status: "invalid" })
})

test("ghost 路线、校验缺省：中性 unverified，不绿", () => {
  const snap = { ...ghostReadiness([key("p2", "anthropic")]), credentialCheck: undefined }
  assert.deepEqual(guideKeyStatus(snap, [{ id: "p2", kind: "anthropic", credentialCheck: { state: "ok" } }]), {
    status: "unverified"
  })
})

test("providerKeyView：设置行 data-key-status / 色调 / 文案 / 改密钥都从这里来", () => {
  const base = { requiresKey: true, hasKey: true }
  const bad = providerKeyView({ ...base, credentialCheck: { state: "invalid" } })!
  assert.equal(bad.status, "invalid")
  assert.equal(bad.tone, "error")
  assert.match(bad.textClass, /error/)
  assert.match(bad.dotClass, /error/)
  assert.equal(bad.labelKey, "settings.providers.keyInvalid")
  assert.equal(bad.showFix, true)
  const maybe = providerKeyView(base)!
  assert.equal(maybe.status, "unverified")
  assert.equal(maybe.tone, "neutral")
  assert.doesNotMatch(maybe.textClass, /success|error/)
  assert.equal(maybe.labelKey, "settings.providers.keyUnverified")
  assert.equal(maybe.showFix, false)
  const good = providerKeyView({ ...base, credentialCheck: { state: "ok" } })!
  assert.equal(good.tone, "success")
  assert.match(good.textClass, /success/)
  assert.equal(good.labelKey, "settings.providers.keyVerified")
  assert.equal(providerKeyView({ requiresKey: true, hasKey: false }), undefined)
})

test("顶部「当前」圆点：被拒红、没法确认灰、ok 绿", () => {
  const base = { requiresKey: true, hasKey: true }
  assert.match(activeProviderDotClass({ ...base, credentialCheck: { state: "invalid" } }), /error/)
  assert.doesNotMatch(activeProviderDotClass(base), /success|error/)
  assert.match(activeProviderDotClass({ ...base, credentialCheck: { state: "ok" } }), /success/)
  assert.match(activeProviderDotClass({ requiresKey: false, hasKey: false }), /success/)
})

test("ghost 路线 + 就绪判 ok：降为灰，不绿、不绑定档案", () => {
  const snap = { ...ghostReadiness([key("p2", "anthropic")]), credentialCheck: { state: "ok" as const } }
  assert.deepEqual(guideKeyStatus(snap, [{ id: "p2", kind: "anthropic", credentialCheck: { state: "ok" } }]), {
    status: "unverified"
  })
})

test("顶部「当前」圆点：当前档案缺密钥时灰", () => {
  assert.doesNotMatch(activeProviderDotClass({ requiresKey: true, hasKey: false }), /success|error/)
  assert.match(activeProviderDotClass({ requiresKey: true, hasKey: false }), /text-tertiary/)
})
