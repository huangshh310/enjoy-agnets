import assert from "node:assert/strict"
import { test } from "node:test"
import {
  catalogFor,
  installKindFor,
  isAllowedDocsUrl,
  latestPackageSource,
  modelArgsFor
} from "./catalogs.ts"

test("P0 CLI 有模型表和安装说明", () => {
  assert.equal(installKindFor("claude"), "npm")
  assert.equal(installKindFor("codex"), "npm")
  assert.equal(installKindFor("antigravity"), process.platform === "win32" ? "copy" : "brew")
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

test("Claude 已装走官方 claude update，不让用户自己敲命令", () => {
  assert.deepEqual(catalogFor("claude")?.selfUpdateArgs, ["update"])
})

test("npm/brew 才有 registry 最新版来源，curl 安装不可知", () => {
  assert.deepEqual(latestPackageSource("codex"), { manager: "npm", name: "@openai/codex" })
  assert.deepEqual(latestPackageSource("antigravity"), { manager: "brew", name: "antigravity-cli" })
  assert.equal(latestPackageSource("cursor"), null)
  assert.equal(latestPackageSource("grok"), null)
})

test("文档 URL 只允许 https 与目录 host", () => {
  assert.equal(isAllowedDocsUrl("https://docs.anthropic.com/en/docs/claude-code"), true)
  assert.equal(isAllowedDocsUrl("https://cursor.com/docs/cli/overview"), true)
  assert.equal(isAllowedDocsUrl("https://docs.x.ai/build/overview"), true)
  assert.equal(isAllowedDocsUrl("https://evil.example/docs"), false)
  assert.equal(isAllowedDocsUrl("http://cursor.com/docs"), false)
  assert.equal(isAllowedDocsUrl("not-a-url"), false)
})

test("DeepSeek 原生插件是复制命令，不是 Enjoy 一键装", () => {
  assert.equal(
    catalogFor("deepseek")?.nativePluginCopy,
    "dsh plugin --profile acp add @openma/dsh-agents-plugins-bridge@latest"
  )
  assert.ok(catalogFor("claude")?.nativePluginCopy?.startsWith("claude plugin"))
})

test("原生插件复制命令可粘贴，不含占位符", () => {
  const ids = [
    "claude",
    "cursor",
    "grok",
    "codex",
    "antigravity",
    "gemini",
    "opencode",
    "pi",
    "hermes",
    "amp",
    "deepseek",
    "qwen",
    "kimi",
    "codebuddy",
    "glm",
    "minimax",
    "qoder",
    "droid",
    "devin"
  ] as const
  for (const id of ids) {
    const copy = catalogFor(id)?.nativePluginCopy
    assert.ok(copy && copy.length > 0, `${id} missing nativePluginCopy`)
    assert.equal(/[<>]/.test(copy), false, `${id} nativePluginCopy has placeholder: ${copy}`)
  }
  assert.equal(catalogFor("cursor")?.nativePluginCopy, "https://cursor.com/marketplace")
  assert.equal(catalogFor("codex")?.nativePluginCopy, "codex plugin marketplace list")
  assert.equal(catalogFor("grok")?.nativePluginCopy, "grok plugin marketplace list")
  assert.equal(catalogFor("amp")?.nativePluginCopy, "amp plugins repositories")
})

test("国产 CLI 有安装说明与文档 host", () => {
  assert.equal(installKindFor("qwen"), "npm")
  assert.equal(installKindFor("codebuddy"), "npm")
  assert.equal(installKindFor("glm"), "npm")
  assert.equal(installKindFor("minimax"), "npm")
  assert.equal(installKindFor("qoder"), "npm")
  assert.equal(installKindFor("kimi"), "copy")
  assert.equal(isAllowedDocsUrl("https://www.codebuddy.cn/cli/"), true)
  assert.equal(isAllowedDocsUrl("https://docs.qoder.com/cli/acp"), true)
})

test("Droid 一键 npm，Devin brew cask（Windows 降 copy），都有官方自更新", () => {
  assert.equal(installKindFor("droid"), "npm")
  assert.deepEqual(latestPackageSource("droid"), { manager: "npm", name: "droid" })
  assert.deepEqual(catalogFor("droid")?.selfUpdateArgs, ["update"])
  assert.equal(isAllowedDocsUrl("https://docs.factory.ai/cli/getting-started/overview"), true)
  assert.equal(installKindFor("devin"), process.platform === "win32" ? "copy" : "brew")
  assert.deepEqual(catalogFor("devin")?.selfUpdateArgs, ["update"])
  assert.deepEqual(catalogFor("devin")?.loginArgs, ["auth", "login"])
  assert.equal(isAllowedDocsUrl("https://docs.devin.ai/cli"), true)
  if (process.platform === "win32") {
    assert.match(catalogFor("devin")?.installCommand ?? "", /setup\.ps1/)
  } else {
    assert.match(catalogFor("devin")?.installCommand ?? "", /install\.sh/)
  }
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
