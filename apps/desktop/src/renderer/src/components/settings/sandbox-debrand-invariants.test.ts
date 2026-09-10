/**
 * P0-0：进阶沙箱 / 本机 CLI 顶条 / 供应商目录 C 端禁止「Vercel」字段标题。
 * 注释与 IPC 字段名可以留实现痕迹；用户可见字符串不行。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { flattenMessageKeys, lookup } from "../../i18n/lookup.ts"
import { en } from "../../i18n/catalogs/en/index.ts"
import { zh } from "../../i18n/catalogs/zh/index.ts"
import { enSettings } from "../../i18n/catalogs/en/settings.ts"
import { zhSettings } from "../../i18n/catalogs/zh/settings.ts"

const dir = dirname(fileURLToPath(import.meta.url))

const surfaces = [
  "settings-harness.tsx",
  "settings-harness-credentials.tsx",
  "harness-status-copy.ts",
  "agent-tools/agent-tools-command-hub.tsx",
  "agent-tools/agent-tool-row.tsx",
  "agent-tools/agent-tool-row-assistant.tsx",
  "agent-tools/agent-tool-row-actions.tsx",
  "providers/providers-settings.tsx",
  "providers/provider-presets-tab.tsx",
  "providers/provider-preset-card.tsx",
  "providers/provider-custom-banner.tsx"
]

const copyKeys = [
  "settings.harness.advancedTitle",
  "settings.harness.pageDesc",
  "settings.harness.runtimeDesc",
  "settings.harness.sandboxBadge",
  "settings.harness.providerLine",
  "settings.harness.sandboxSaved",
  "settings.harness.sandboxMissing",
  "settings.harness.isolationToken",
  "settings.harness.isolationTokenDesc",
  "settings.harness.tokenPlaceholder",
  "settings.harness.saveToken",
  "settings.harness.needBoth",
  "settings.harness.teamId",
  "settings.harness.projectId",
  "settings.agent.hubHarness",
  "settings.agentTools.sandboxTokenReady",
  "settings.runtimeCaps.sandboxLabel",
  "settings.providers.official",
  "settings.capabilities.specsTitle",
  "common.runtimeHarness"
]

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

function quotedStrings(src: string): string[] {
  const body = stripComments(src)
  return [...body.matchAll(/["'`]([^"'`]{0,200})["'`]/g)].map((hit) => hit[1])
}

function catalogStrings(node: unknown): string[] {
  if (typeof node === "string") return [node]
  if (typeof node !== "object" || node === null) return []
  return Object.values(node).flatMap(catalogStrings)
}

test("沙箱 / 供应商表面的用户可见字符串不含 Vercel", () => {
  for (const name of surfaces) {
    const src = readFileSync(join(dir, name), "utf8")
    for (const text of quotedStrings(src)) {
      assert.ok(!/vercel/i.test(text), `${name} quoted "Vercel": ${text}`)
      assert.ok(!/Token：Vercel|Token: Vercel/.test(text), `${name} brands the token tip`)
    }
  }
})

test("设置词表这些键不含 Vercel，占位不是 vercel token", () => {
  const catalogs = [
    { id: "zh", tree: zh },
    { id: "en", tree: en }
  ]
  const keys = new Set(flattenMessageKeys(zh))
  for (const key of copyKeys) {
    assert.ok(keys.has(key), `missing i18n key ${key}`)
    for (const catalog of catalogs) {
      const value = lookup(catalog.tree, key)
      assert.ok(!/vercel/i.test(value), `${catalog.id} ${key} still says Vercel: ${value}`)
    }
  }
  assert.ok(!lookup(zh, "settings.harness.tokenPlaceholder").toLowerCase().includes("vercel"))
  assert.equal(lookup(zh, "settings.harness.isolationToken"), "隔离令牌")
  assert.equal(lookup(zh, "settings.harness.saveToken"), "保存隔离令牌")
  assert.equal(lookup(zh, "settings.providers.official"), "AI SDK 兼容")
  for (const text of [...catalogStrings(zhSettings), ...catalogStrings(enSettings)]) {
    assert.ok(!/vercel/i.test(text), `settings catalog still says Vercel: ${text}`)
  }
})

test("进阶沙箱仍不在 Composer 导轨源码里当引擎项", () => {
  const pickerDir = join(dir, "../ai-chat/agent-picker")
  const agents = readFileSync(join(pickerDir, "composer-agents.ts"), "utf8")
  const rail = readFileSync(join(pickerDir, "agent-engine-rail.tsx"), "utf8")
  assert.ok(!agents.includes("sandbox-harness"))
  assert.ok(!rail.includes("sandbox-harness"))
  for (const text of quotedStrings(rail)) {
    assert.ok(!/vercel/i.test(text), `engine rail quoted Vercel: ${text}`)
  }
})
