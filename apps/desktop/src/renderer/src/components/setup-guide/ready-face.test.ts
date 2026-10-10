/**
 * 末屏只认 ready，引擎数不能冒充可以开始。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { showReadyUnverifiedHint } from "../../lib/credential-check-ui.ts"
import { readyGuideFinishes, readyGuidePrimaryKey, readyGuideTitleKey } from "./ready-face.ts"

test("有可对话路线才写可以开始了", () => {
  assert.equal(readyGuideTitleKey(true), "settings.setupGuide.readyTitle")
  assert.equal(readyGuidePrimaryKey(true), "settings.setupGuide.start")
  assert.equal(readyGuideFinishes(true), true)
})

test("没有路线写还差一步，主钮去连接", () => {
  assert.equal(readyGuideTitleKey(false), "settings.setupGuide.readyNeedTitle")
  assert.equal(readyGuidePrimaryKey(false), "settings.setupGuide.goConnect")
  assert.equal(readyGuideFinishes(false), false)
})

test("option A：唯一未验证密钥算 ready，标题仍是可以开始了", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [{ kind: "api_key", providerId: "p", presetId: "deepseek" }],
    engineCount: 1,
    hasEnjoySecret: true,
    credentialCheck: { state: "unverified", code: "unknown" }
  })
  assert.equal(snap.ready, true)
  assert.equal(snap.credentialCheck?.state, "unverified")
  assert.equal(readyGuideTitleKey(snap.ready), "settings.setupGuide.readyTitle")
  assert.equal(readyGuidePrimaryKey(snap.ready), "settings.setupGuide.start")
  assert.equal(readyGuideFinishes(snap.ready), true)
})

test("末屏副标题只在 ready 且默认路线 unverified 时出现，不重算 ready", () => {
  assert.equal(showReadyUnverifiedHint({ ready: true, credentialState: "unverified" }), true)
  assert.equal(showReadyUnverifiedHint({ ready: false, credentialState: "unverified" }), false)
  assert.equal(showReadyUnverifiedHint({ ready: true, credentialState: "ok" }), false)
})

test("未验证本机模型不把末屏写成可以开始了，只认 ready", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [{ kind: "local_model", service: "ollama", verified: false }],
    apiKeys: [],
    engineCount: 1
  })
  assert.equal(snap.ready, false)
  assert.equal(readyGuideTitleKey(snap.ready), "settings.setupGuide.readyNeedTitle")
  assert.equal(readyGuideFinishes(snap.ready), false)
})
