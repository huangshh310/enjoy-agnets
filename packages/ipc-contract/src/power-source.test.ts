/**
 * 动力源列同构：每家助手都有；Cursor/Grok 不能缺行；不假 BYOK。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { capabilitiesFor } from "./runtime-capabilities.ts"
import {
  classifyPowerSource,
  describePowerSource,
  ompPowerFromSelection
} from "./power-source.ts"

const OFFICIAL_ONLY = ["cursor", "grok", "antigravity", "amp", "pi", "hermes"] as const
const BINDABLE = ["claude", "codex", "deepseek", "gemini", "opencode"] as const

test("分类只信 providerBind / runtime，不按 Cursor 品牌藏列", () => {
  assert.equal(classifyPowerSource("enjoy-local"), "enjoy-vault")
  assert.equal(classifyPowerSource("omp"), "omp")
  assert.equal(classifyPowerSource("custom:demo"), "none")
  for (const id of BINDABLE) {
    assert.notEqual(capabilitiesFor(id).providerBind, "none")
    assert.equal(classifyPowerSource(id), "bindable")
  }
  for (const id of OFFICIAL_ONLY) {
    assert.equal(capabilitiesFor(id).providerBind, "none")
    assert.equal(classifyPowerSource(id), "official")
  }
})

test("每条 runtime 的动力源列都 present", () => {
  const ids = ["enjoy-local", ...BINDABLE, ...OFFICIAL_ONLY, "omp", "custom:foo"]
  for (const runtimeId of ids) {
    const parts = describePowerSource({ runtimeId })
    assert.equal(parts.present, true, `${runtimeId} missing power-source column`)
    assert.ok(parts.mode === "vault" || parts.mode === "official" || parts.mode === "omp")
  }
})

test("仅官方四态：授权中 / 失败仍是官方登录，不是 vault", () => {
  const auth = describePowerSource({
    runtimeId: "cursor",
    loggedIn: false,
    loginLoop: "authorizing"
  })
  assert.equal(auth.mode, "official")
  assert.equal(auth.official, "auth")
  assert.equal(auth.archive, undefined)

  const fail = describePowerSource({
    runtimeId: "amp",
    loggedIn: false,
    loginLoop: "failed"
  })
  assert.equal(fail.mode, "official")
  assert.equal(fail.official, "fail")
})

test("自定义 ACP 动力源永远是空列，不假官方登录也不假 vault", () => {
  const parts = describePowerSource({
    runtimeId: "custom:my-acp",
    useCustomProvider: true,
    boundProviderName: "lucky0625",
    selectedModel: "hy3",
    loggedIn: true
  })
  assert.equal(parts.kind, "none")
  assert.equal(parts.archive, "")
  assert.equal(parts.model, "")
  assert.equal(parts.official, undefined)
})

test("OMP 未选供应商时走官方登录检测/未登录，不假装 Enjoy 档案", () => {
  const checking = describePowerSource({
    runtimeId: "omp",
    inspecting: true,
    loggedIn: null,
    enjoyArchive: "lucky0625",
    enjoyModel: "deepseek-v4-flash"
  })
  assert.equal(checking.mode, "official")
  assert.equal(checking.official, "check")
  assert.equal(checking.archive, undefined)

  const signedOut = describePowerSource({
    runtimeId: "omp",
    loggedIn: false
  })
  assert.equal(signedOut.mode, "official")
  assert.equal(signedOut.official, "out")
})

test("Pi / Hermes 已装未就绪是官方登录，不是 BYOK", () => {
  for (const runtimeId of ["pi", "hermes"] as const) {
    const checking = describePowerSource({ runtimeId, loggedIn: null, inspecting: true })
    assert.equal(checking.mode, "official")
    assert.equal(checking.official, "check")
    const out = describePowerSource({ runtimeId, loggedIn: false })
    assert.equal(out.official, "out")
    assert.equal(out.archive, undefined)
  }
})

test("Cursor / Grok 是官方登录，不假装 Enjoy 档案", () => {
  for (const runtimeId of ["cursor", "grok"] as const) {
    const parts = describePowerSource({
      runtimeId,
      useCustomProvider: true,
      boundProviderName: "lucky0625",
      selectedModel: "hy3",
      loggedIn: true
    })
    assert.equal(parts.present, true)
    assert.equal(parts.mode, "official")
    assert.equal(parts.official, "in")
    assert.equal(parts.archive, undefined)
  }
})

test("可绑助手：档案+模型；未绑走官方登录态", () => {
  const bound = describePowerSource({
    runtimeId: "claude",
    useCustomProvider: true,
    boundProviderName: "deep",
    selectedModel: "deepseek-v4-pro"
  })
  assert.equal(bound.mode, "vault")
  assert.equal(bound.archive, "deep")
  assert.equal(bound.model, "deepseek-v4-pro")

  const official = describePowerSource({
    runtimeId: "claude",
    useCustomProvider: false,
    loggedIn: false
  })
  assert.equal(official.mode, "official")
  assert.equal(official.official, "out")
})

test("OMP 槽位用自己的供应商，不是 Enjoy vault 档案名", () => {
  const fromSlash = ompPowerFromSelection("google-antigravity/gemini-3.6-flash", [
    { id: "google-antigravity", label: "Google Antigravity", loggedIn: true }
  ])
  assert.equal(fromSlash.supplier, "Google Antigravity")
  assert.equal(fromSlash.model, "gemini-3.6-flash")

  const parts = describePowerSource({
    runtimeId: "omp",
    enjoyArchive: "lucky0625",
    enjoyModel: "deepseek-v4-flash",
    ompSupplier: "default",
    ompModel: "google-antigravity"
  })
  assert.equal(parts.mode, "omp")
  assert.equal(parts.archive, "default")
  assert.equal(parts.model, "google-antigravity")
})

test("Enjoy 本地走 vault 档案，不是官方登录伪装", () => {
  const parts = describePowerSource({
    runtimeId: "enjoy-local",
    enjoyArchive: "lucky0625",
    enjoyModel: "deepseek-v4-flash",
    loggedIn: false
  })
  assert.equal(parts.kind, "enjoy-vault")
  assert.equal(parts.mode, "vault")
  assert.equal(parts.archive, "lucky0625")
  assert.equal(parts.model, "deepseek-v4-flash")
})
