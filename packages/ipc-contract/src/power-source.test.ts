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
  assert.equal(classifyPowerSource("custom:demo"), "official")
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
