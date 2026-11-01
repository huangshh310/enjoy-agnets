/**
 * 末屏只认 ready，引擎数不能冒充可以开始。
 * ready + unverified 走占位键，不回落「还差一步」。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { readyGuideFinishes, readyGuidePrimaryKey, readyGuideSecondaryKey, readyGuideTitleKey } from "./ready-face.ts"

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


test("ready + 余额不足：不写可以开始了，主钮仍可进应用，次钮先逛逛", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [{ kind: "api_key", providerId: "p", presetId: "deepseek" }],
    engineCount: 1,
    hasEnjoySecret: true,
    credentialCheck: { state: "unverified", code: "billing" }
  })
  assert.equal(snap.ready, true)
  assert.equal(
    readyGuideTitleKey(snap.ready, snap.credentialCheck?.state, undefined, snap.credentialCheck?.code),
    "settings.setupGuide.readyBillingTitle"
  )
  assert.equal(readyGuidePrimaryKey(snap.ready), "settings.setupGuide.start")
  assert.equal(readyGuideSecondaryKey(snap.ready, snap.credentialCheck?.code), "settings.setupGuide.browseFirst")
  assert.equal(readyGuideFinishes(snap.ready), true)
})

test("ready + unverified 非余额：仍走密钥还没验证，无次钮", () => {
  assert.equal(
    readyGuideTitleKey(true, "unverified", undefined, "timeout"),
    "settings.setupGuide.readyUnverifiedTitle"
  )
  assert.equal(readyGuideSecondaryKey(true, "timeout"), undefined)
  assert.equal(readyGuideSecondaryKey(true, "forbidden"), undefined)
  assert.equal(readyGuideSecondaryKey(false), "settings.setupGuide.browseFirst")
})


test("完成页余额：摘要走 guideKeyHint / renderKeyHint；对话框传 credential code", async () => {
  const { readFileSync } = await import("node:fs")
  const { dirname, join } = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const dir = dirname(fileURLToPath(import.meta.url))
  const summary = readFileSync(join(dir, "ready-summary.tsx"), "utf8")
  const dialog = readFileSync(join(dir, "setup-guide-dialog.tsx"), "utf8")
  assert.match(summary, /guideKeyHint\(/)
  assert.match(summary, /renderKeyHint\(/)
  assert.match(summary, /ready-billing-summary/)
  assert.match(summary, /requestOpenExternalQuiet/)
  assert.match(dialog, /readyGuideSecondaryKey\(chatReady, readiness\?\.credentialCheck\?\.code\)/)
  const { zhSettings } = await import("../../i18n/catalogs/zh/settings.ts")
  const { enSettings } = await import("../../i18n/catalogs/en/settings.ts")
  assert.equal(zhSettings.setupGuide.readyBillingTitle, "余额不足，先充值再开始")
  assert.equal(enSettings.setupGuide.readyBillingTitle, "Out of credit — top up before you start")
  assert.ok(!/可以开始了/.test(zhSettings.setupGuide.readyBillingTitle))
})
