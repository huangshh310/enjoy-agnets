/**
 * P0-S 文案锁：已注入本轮 / 未注入诚实卡。禁止空绿成功与协议微标。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"
import { enSettings } from "../../../../i18n/catalogs/en/settings.ts"
import { zhSettings } from "../../../../i18n/catalogs/zh/settings.ts"

const dir = dirname(fileURLToPath(import.meta.url))

function readPreview(): string {
  let cursor = dir
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(cursor, "design/previews/p0-s-skills-mcp-inject.html")
    try {
      return readFileSync(candidate, "utf8")
    } catch {
      cursor = join(cursor, "..")
    }
  }
  throw new Error("p0-s-skills-mcp-inject.html 必须在仓内")
}

const preview = readPreview()
const bar = readFileSync(join(dir, "host-inject-bar.tsx"), "utf8")
const view = readFileSync(join(dir, "host-inject-view.ts"), "utf8")
const honesty = readFileSync(join(dir, "../../../settings/agent-tools/native-plugin-copy.tsx"), "utf8")

test("预览真源仍锁三态与禁词", () => {
  assert.ok(preview.includes("【视觉真源】P0-S"))
  assert.ok(preview.includes("已注入本轮 · MCP 2 · Skills 3"))
  assert.ok(preview.includes("此引擎只用自带 MCP；Enjoy"))
  assert.ok(preview.includes("此引擎不支持宿主技能注入"))
  assert.ok(preview.includes("来自 Enjoy"))
  assert.ok(preview.includes("已同步到助手"))
})

test("中英词表对齐预览，不用已同步/已注入 0", () => {
  assert.equal(zhChat.hostInjectedTurn, "已注入本轮 · MCP {mcp} · Skills {skills}")
  assert.equal(zhChat.hostInjectEnabled, "已启用 {mcp} MCP · {skills} Skills")
  assert.equal(zhChat.hostInjectMcpUnsupported, "此引擎只用自带 MCP；Enjoy #/mcp 未注入")
  assert.equal(zhChat.hostInjectSkillsUnsupported, "此引擎不支持宿主技能注入")
  assert.equal(zhChat.hostInjectFromEnjoy, "来自 Enjoy")
  assert.equal(zhChat.hostInjectManageMcp, "管理 → #/mcp")
  assert.equal(zhChat.hostInjectManageSkills, "管理 → #/skills")
  assert.equal(zhChat.hostInjectFootnote, "真源在 Enjoy；助手只消费。原生插件仍在各 CLI。")
  assert.equal(zhSettings.agentTools.hostExtensionsFootnote, zhChat.hostInjectFootnote)
  assert.doesNotMatch(zhChat.hostInjectedTurn, /已同步|已配置/)
  assert.doesNotMatch(zhChat.hostInjectedTurnMcp, /已注入 0|Skills 0/)
  assert.doesNotMatch(enChat.hostInjectedTurn, /synced|Ready|ACP/i)
  assert.doesNotMatch(enChat.hostInjectSkillsUnsupported, /cannot consume|synced|Ready/i)
  assert.equal(enChat.hostInjectSkillsUnsupported, "This engine does not support host skill injection")
  assert.doesNotMatch(zhSettings.agentTools.hostExtensionsEnabled, /已就绪|已同步/)
  assert.doesNotMatch(enSettings.agentTools.hostExtensionsFootnote, /marketplace|Grok store/i)
})

test("微条与抽屉源码不含空绿成功与协议微标", () => {
  assert.ok(bar.includes("hostInjectedTurn"))
  assert.ok(bar.includes("hostInjectFootnote"))
  assert.ok(bar.includes("hostInjectMcpUnsupported"))
  assert.ok(bar.includes('to: "/mcp"'))
  assert.ok(bar.includes('to: "/skills"'))
  assert.ok(!bar.includes("已同步到助手"))
  assert.ok(!bar.includes("ACP"))
  assert.ok(!bar.includes("hostExtensionsBadge"))
  assert.ok(view.includes('kind: "hidden"'))
  assert.ok(view.includes("hostInjectCountLane"))
  assert.ok(!honesty.includes("hostExtensionsBadge"))
  assert.ok(!honesty.includes("bg-status-success-default"))
  assert.ok(honesty.includes("hostExtensionsFootnote"))
})
