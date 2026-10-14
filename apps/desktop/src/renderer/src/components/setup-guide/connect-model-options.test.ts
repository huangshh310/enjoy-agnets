/**
 * 向导「连一个模型」只按真实检测露出选项。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import {
  apiKeyBadgeTone,
  apiKeyBadgeView,
  connectModelOptions,
  connectModelRowAction,
  connectModelRowHintKey
} from "./connect-model-options.ts"

test("全新安装只露添加密钥和以后再连，两行等权", () => {
  const options = connectModelOptions(
    buildChatReadiness({ engines: [], localModels: [], apiKeys: [], engineCount: 1 })
  )
  assert.deepEqual(
    options.map((item) => item.kind),
    ["api_key", "later"]
  )
  assert.equal(options[0] && "recommended" in options[0] && options[0].recommended, false)
})

test("已登录引擎和本机模型按探测露出，推荐第一条引擎", () => {
  const options = connectModelOptions(
    buildChatReadiness({
      engines: [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }],
      localModels: [{ kind: "local_model", service: "ollama" }],
      apiKeys: [],
      engineCount: 2
    })
  )
  assert.deepEqual(
    options.map((item) => item.kind),
    ["engine", "local_model", "api_key", "later"]
  )
  assert.equal(options[0]?.kind === "engine" && options[0].recommended, true)
  assert.equal(options[1]?.kind === "local_model" && options[1].recommended, false)
})

test("已有 API 密钥时该行标已连上，不推荐再添加", () => {
  const options = connectModelOptions(
    buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [{ kind: "api_key", providerId: "p1", presetId: "openai" }],
      engineCount: 0
    })
  )
  const key = options.find((item) => item.kind === "api_key")
  assert.equal(key?.kind === "api_key" && key.connected, true)
  assert.equal(key?.kind === "api_key" && key.recommended, false)
})

test("未连上的添加密钥是动作，其余点选", () => {
  const fresh = connectModelOptions(
    buildChatReadiness({ engines: [], localModels: [], apiKeys: [], engineCount: 1 })
  )
  const key = fresh.find((item) => item.kind === "api_key")
  const later = fresh.find((item) => item.kind === "later")
  assert.equal(connectModelRowAction(key!), "add-key")
  assert.equal(connectModelRowAction(later!), "select")
  const connected = connectModelOptions(
    buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [{ kind: "api_key", providerId: "p1", presetId: "openai" }],
      engineCount: 0
    })
  ).find((item) => item.kind === "api_key")
  assert.equal(connectModelRowAction(connected!), "select")
})

test("没有快照时仍露出始终可点的两行", () => {
  assert.deepEqual(
    connectModelOptions(undefined).map((item) => item.kind),
    ["api_key", "later"]
  )
})

test("远端未验证本机模型露出「未验证」，不推荐、不占就绪槽", () => {
  const options = connectModelOptions(
    buildChatReadiness({
      engines: [],
      localModels: [{ kind: "local_model", service: "ollama", verified: false }],
      apiKeys: [],
      engineCount: 1
    })
  )
  const local = options.find((item) => item.kind === "local_model")
  assert.equal(local?.kind === "local_model" && local.verified, false)
  assert.equal(local?.kind === "local_model" && local.recommended, false)
  assert.equal(connectModelRowHintKey(local!), "settings.setupGuide.connectLocalUnverifiedWhy")
  const key = options.find((item) => item.kind === "api_key")
  assert.equal(key?.kind === "api_key" && key.recommended, true)
})

test("已验证本机模型才推荐，hint 不是未验证", () => {
  const options = connectModelOptions(
    buildChatReadiness({
      engines: [],
      localModels: [{ kind: "local_model", service: "ollama", verified: true }],
      apiKeys: [],
      engineCount: 1
    })
  )
  const local = options.find((item) => item.kind === "local_model")
  assert.equal(local?.kind === "local_model" && local.verified, true)
  assert.equal(local?.kind === "local_model" && local.recommended, true)
  assert.equal(connectModelRowHintKey(local!), "settings.setupGuide.connectLocalHint")
})

test("已存密钥按三态露出：被拒点行改密钥，不再写已连上", () => {
  const mk = (state: "ok" | "invalid" | "unverified") =>
    connectModelOptions(
      buildChatReadiness({
        engines: [],
        localModels: [],
        apiKeys: [{ kind: "api_key", providerId: "p1", presetId: "openai" }],
        engineCount: 1,
        hasEnjoySecret: true,
        activeKeyProfileId: "p1",
        credentialCheck: { state }
      })
    ).find((item) => item.kind === "api_key")!
  const bad = mk("invalid")
  assert.equal(bad.kind === "api_key" && bad.keyStatus, "invalid")
  assert.equal(bad.kind === "api_key" && bad.providerName, "OpenAI")
  assert.equal(connectModelRowAction(bad), "fix-key")
  assert.equal(connectModelRowHintKey(bad), "settings.setupGuide.connectApiKeyInvalidHint")
  const maybe = mk("unverified")
  assert.equal(connectModelRowAction(maybe), "select")
  assert.equal(connectModelRowHintKey(maybe), "settings.setupGuide.connectApiKeyUnverifiedHint")
  const good = mk("ok")
  assert.equal(good.kind === "api_key" && good.keyStatus, "ok")
  assert.equal(connectModelRowHintKey(good), "settings.setupGuide.connectApiKeyHint")
})

test("第 4 步徽标：被拒红、没法确认灰、ok 才绿；没存密钥不画", () => {
  const row = (state?: "ok" | "invalid" | "unverified") =>
    connectModelOptions(
      buildChatReadiness({
        engines: [],
        localModels: [],
        apiKeys: [{ kind: "api_key", providerId: "p1", presetId: "openai" }],
        engineCount: 1,
        hasEnjoySecret: true,
        activeKeyProfileId: "p1",
        ...(state ? { credentialCheck: { state } } : {})
      })
    ).find((item) => item.kind === "api_key")!
  assert.equal(apiKeyBadgeTone(row("invalid")), "error")
  assert.equal(apiKeyBadgeTone(row("unverified")), "neutral")
  assert.equal(apiKeyBadgeTone(row()), "neutral")
  assert.equal(apiKeyBadgeTone(row("ok")), "success")
  const fresh = connectModelOptions(buildChatReadiness({ engines: [], localModels: [], apiKeys: [], engineCount: 1 }))
  assert.equal(apiKeyBadgeTone(fresh.find((item) => item.kind === "api_key")!), undefined)
})

test("第 4 步徽标视图：data-key-status / 色调类 / 文案键 / 改密钥，组件直接用", () => {
  const row = (state?: "ok" | "invalid" | "unverified") =>
    connectModelOptions(
      buildChatReadiness({
        engines: [],
        localModels: [],
        apiKeys: [{ kind: "api_key", providerId: "p1", presetId: "openai" }],
        engineCount: 1,
        hasEnjoySecret: true,
        activeKeyProfileId: "p1",
        ...(state ? { credentialCheck: { state } } : {})
      })
    ).find((item) => item.kind === "api_key")!
  const bad = apiKeyBadgeView(row("invalid"))!
  assert.equal(bad.status, "invalid")
  assert.match(bad.textClass, /error/)
  assert.equal(bad.labelKey, "settings.setupGuide.fixKey")
  assert.equal(bad.showFix, true)
  const maybe = apiKeyBadgeView(row())!
  assert.equal(maybe.status, "unverified")
  assert.doesNotMatch(maybe.textClass, /success|error/)
  assert.equal(maybe.labelKey, "settings.setupGuide.connectApiKeyUnverified")
  const good = apiKeyBadgeView(row("ok"))!
  assert.equal(good.status, "ok")
  assert.match(good.textClass, /success/)
  assert.equal(good.labelKey, "settings.setupGuide.connectApiKeyConnected")
})

test("apiKeyBadgeView 缺省分支：非密钥行 / 没存密钥不画；已存但没状态按 unverified 中性", () => {
  assert.equal(apiKeyBadgeView({ id: "later", kind: "later" }), undefined)
  assert.equal(
    apiKeyBadgeView({ id: "engine:claude", kind: "engine", runtimeId: "claude", name: "Claude", recommended: true }),
    undefined
  )
  assert.equal(apiKeyBadgeView({ id: "api_key", kind: "api_key", connected: false, recommended: false }), undefined)
  const bare = apiKeyBadgeView({ id: "api_key", kind: "api_key", connected: true, recommended: false })!
  assert.equal(bare.status, "unverified")
  assert.equal(bare.tone, "neutral")
  assert.doesNotMatch(bare.textClass, /success|error/)
  assert.equal(bare.showFix, false)
  assert.equal(bare.labelKey, "settings.setupGuide.connectApiKeyUnverified")
})
