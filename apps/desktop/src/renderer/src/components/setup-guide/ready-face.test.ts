/**
 * 末屏只认 ready，引擎数不能冒充可以开始。
 * ready + unverified 走占位键，不回落「还差一步」。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
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

test("ready 但密钥未验证走占位键，不回落还差一步", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [{ kind: "api_key", providerId: "p", presetId: "openai" }],
    engineCount: 1,
    hasEnjoySecret: true,
    credentialCheck: { state: "unverified", code: "timeout" }
  })
  assert.equal(snap.ready, true)
  assert.equal(snap.credentialCheck?.state, "unverified")
  assert.equal(readyGuideTitleKey(snap.ready, snap.credentialCheck?.state), "settings.setupGuide.readyUnverifiedTitle")
  assert.equal(readyGuidePrimaryKey(snap.ready), "settings.setupGuide.start")
  assert.equal(readyGuideFinishes(snap.ready), true)
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

test("没 ready 且密钥被拒：标题说被拒、主钮改密钥，不回第 4 步绕圈", async () => {
  const { readyGuidePrimaryAction } = await import("./ready-face.ts")
  assert.equal(readyGuideTitleKey(false, "invalid", "invalid"), "settings.setupGuide.readyKeyInvalidTitle")
  assert.equal(readyGuidePrimaryKey(false, "invalid"), "settings.setupGuide.fixKey")
  assert.equal(readyGuidePrimaryAction(false, "invalid"), "fix-key")
  assert.equal(readyGuidePrimaryAction(false, "unverified"), "connect")
  assert.equal(readyGuidePrimaryAction(true, "ok"), "finish")
})

test("末屏图标：ready+unverified 用中性图标，不配绿✓", async () => {
  const { readyMarkKind } = await import("./ready-face.ts")
  assert.equal(readyMarkKind(true, "ok"), "ok")
  assert.equal(readyMarkKind(true, undefined), "ok")
  assert.equal(readyMarkKind(true, "unverified"), "unverified")
  assert.equal(readyMarkKind(false, "invalid"), "pending")
})
