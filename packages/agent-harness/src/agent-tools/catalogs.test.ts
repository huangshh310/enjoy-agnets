import assert from "node:assert/strict"
import { test } from "node:test"
import { catalogFor, installKindFor, isAllowedDocsUrl, modelArgsFor } from "./catalogs.ts"

test("P0 CLI 有模型表和安装说明", () => {
  assert.equal(installKindFor("claude"), "npm")
  assert.equal(installKindFor("codex"), "npm")
  assert.equal(installKindFor("antigravity"), "brew")
  assert.equal(installKindFor("cursor"), "copy")
  assert.ok((catalogFor("claude")?.models.length ?? 0) >= 3)
  assert.ok((catalogFor("cursor")?.models.length ?? 0) >= 3)
})

test("模型参数只要有 id 就传，Grok 留给 spawn 插到 stdio 前", () => {
  assert.deepEqual(modelArgsFor("claude", "claude-sonnet-4-6"), ["--model", "claude-sonnet-4-6"])
  assert.deepEqual(modelArgsFor("claude", "not-a-model"), ["--model", "not-a-model"])
  assert.deepEqual(modelArgsFor("claude", undefined), [])
  assert.deepEqual(modelArgsFor("grok", "grok-4.6"), [])
})

test("卸载 argv 写死在配方里，不从 install 推断", () => {
  const claude = catalogFor("claude")?.steps[0]
  assert.deepEqual(claude?.uninstallArgs, ["uninstall", "-g", "@anthropic-ai/claude-code"])
  const brew = catalogFor("antigravity")?.steps[0]
  assert.deepEqual(brew?.uninstallArgs, ["uninstall", "antigravity-cli"])
  assert.equal(catalogFor("cursor")?.steps.length, 0)
})

test("文档 URL 只允许 https 与目录 host", () => {
  assert.equal(isAllowedDocsUrl("https://docs.anthropic.com/en/docs/claude-code"), true)
  assert.equal(isAllowedDocsUrl("https://cursor.com/docs/cli/overview"), true)
  assert.equal(isAllowedDocsUrl("https://docs.x.ai/build/overview"), true)
  assert.equal(isAllowedDocsUrl("https://evil.example/docs"), false)
  assert.equal(isAllowedDocsUrl("http://cursor.com/docs"), false)
  assert.equal(isAllowedDocsUrl("not-a-url"), false)
})

test("Grok Build 是 copy 安装，有模型表", () => {
  assert.equal(installKindFor("grok"), "copy")
  assert.equal(catalogFor("grok")?.defaultModel, "grok-4.6")
  assert.equal(catalogFor("grok")?.loginArgs[0], "login")
})

test("七家新 CLI 有安装说明；Pi 两步 npm；Amp 登录走 amp", () => {
  assert.equal(installKindFor("gemini"), "npm")
  assert.equal(installKindFor("opencode"), "npm")
  assert.equal(installKindFor("pi"), "npm")
  assert.equal(catalogFor("pi")?.steps.length, 2)
  assert.equal(installKindFor("hermes"), "copy")
  assert.equal(installKindFor("amp"), "copy")
  assert.equal(catalogFor("amp")?.loginBinary, "amp")
  assert.equal(installKindFor("deepseek"), "npm")
  assert.equal(installKindFor("omp"), "copy")
  assert.equal(isAllowedDocsUrl("https://geminicli.com/docs/cli/acp-mode/"), true)
  assert.equal(isAllowedDocsUrl("https://opencode.ai/docs/acp"), true)
  assert.equal(isAllowedDocsUrl("https://ohmypi.xyz/"), true)
  assert.deepEqual(modelArgsFor("deepseek", "deepseek-v4-pro"), [])
  assert.deepEqual(modelArgsFor("amp", "ultra"), [])
  assert.deepEqual(modelArgsFor("gemini", "gemini-2.5-pro"), ["--model", "gemini-2.5-pro"])
})
