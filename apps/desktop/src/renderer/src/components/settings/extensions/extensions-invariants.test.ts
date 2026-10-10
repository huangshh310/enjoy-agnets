/**
 * 扩展发现壳不变量：导航、深链、禁词、工作模块轨不加第八项。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { WORK_MODULE_IDS } from "../../app-shell/app-shell.types.ts"
import { WORK_RAIL_ITEMS } from "../../app-shell/chrome/module-registry.ts"
import { FEATURED_MCP_PRESETS } from "../../mcp/constants/mcp-presets.ts"
import { CURATED_SKILL_SOURCES } from "../../skills/constants/skills-curated.constants.ts"
import { SETTINGS_NAV_DEF } from "../settings-catalog-nav.ts"
import { SETTINGS_SECTIONS } from "../settings-sections.ts"
import { zh } from "../../../i18n/catalogs/zh/index.ts"
import { en } from "../../../i18n/catalogs/en/index.ts"
import {
  EXTENSIONS_CURATED_LIMIT,
  EXTENSIONS_FORBIDDEN_TERMS,
  EXTENSIONS_HUB_MCP_IDS,
  EXTENSIONS_HUB_SKILL_IDS,
  MCP_HUB_HREF,
  SKILLS_HUB_HREF
} from "./constants.ts"
import { pickByIds, projectMcpCurated, projectSkillsCurated } from "./extensions-curated.ts"
import { mcpHubHref, mcpPresetHref, skillsHubHref, skillsInstallHref } from "./extensions-hrefs.ts"
import { resolveExtensionsLegacyRedirect } from "./extensions-legacy-redirect.ts"

test("工作区组含 extensions，且 MCP 仍在", () => {
  const group = SETTINGS_NAV_DEF.find((item) => item.id === "workspace")
  assert.ok(group)
  const ids = group.items.map((item) => item.id)
  assert.deepEqual(ids, ["workspace", "extensions", "mcp"])
  assert.ok(SETTINGS_SECTIONS.includes("extensions"))
})

test("添加深链仍指向现有 #/mcp / #/skills，精选卡不再靠 href 当 CRUD", () => {
  assert.equal(mcpHubHref(), MCP_HUB_HREF)
  assert.equal(skillsHubHref(), `${SKILLS_HUB_HREF}?tab=curated`)
  assert.equal(mcpPresetHref("filesystem"), "#/mcp?preset=filesystem")
  assert.equal(skillsInstallHref("obra-superpowers"), "#/skills?tab=curated&install=obra-superpowers")
  const hubMcp = projectMcpCurated(pickByIds(FEATURED_MCP_PRESETS, EXTENSIONS_HUB_MCP_IDS))
  const hubSkills = projectSkillsCurated(pickByIds(CURATED_SKILL_SOURCES, EXTENSIONS_HUB_SKILL_IDS))
  assert.deepEqual(hubMcp.map((card) => card.id), [...EXTENSIONS_HUB_MCP_IDS])
  assert.deepEqual(hubSkills.map((card) => card.id), [...EXTENSIONS_HUB_SKILL_IDS])
  assert.equal(hubMcp.length, EXTENSIONS_CURATED_LIMIT)
  assert.equal(hubSkills.length, EXTENSIONS_CURATED_LIMIT)
  assert.ok(hubMcp.every((card) => card.kind === "mcp" && card.transport))
  assert.ok(hubSkills.every((card) => card.kind === "skills" && card.locator))
})

test("扩展页 copy 不含 Registry、本机 CLI、ACP、已同步到助手", () => {
  const blob = JSON.stringify({ zh: zh.settings.extensions, en: en.settings.extensions })
  for (const term of EXTENSIONS_FORBIDDEN_TERMS) {
    assert.equal(blob.includes(term), false, `forbidden: ${term}`)
  }
  assert.doesNotMatch(zh.settings.extensions.footnote, /#\/mcp|#\/skills|真源|curated/)
  assert.doesNotMatch(en.settings.extensions.footnote, /#\/mcp|#\/skills/)
  assert.equal(zh.settings.extensions.curatedTitle, "精选")
  assert.equal(zh.settings.extensions.curatedDesc, "精选推荐，点一下就能加到本机，不另开商店。")
  assert.equal(zh.settings.extensions.openMcp, "打开 MCP")
  assert.equal(zh.settings.extensions.skillsTitle, "技能")
  assert.equal(zh.settings.extensions.openSkills, "打开技能")
  assert.equal(zh.settings.extensions.written, "已写入 Enjoy · 下一轮可注入")
  assert.equal(zh.settings.extensions.catalogFailTitle, "精选暂时加载不了")
  assert.equal(zh.settings.extensions.addToMcp, "添加到 MCP")
  assert.equal(zh.settings.extensions.addToSkills, "添加到技能")
})

test("WORK_MODULE_IDS 保持 chat · knowledge · workflows · media · mcp · skills，不上第八轨", () => {
  assert.deepEqual([...WORK_MODULE_IDS], [
    "chat",
    "knowledge",
    "workflows",
    "media",
    "mcp",
    "skills"
  ])
  assert.deepEqual(
    WORK_RAIL_ITEMS.map((item) => item.id),
    [...WORK_MODULE_IDS]
  )
  assert.equal((WORK_MODULE_IDS as readonly string[]).includes("extensions"), false)
  assert.equal((WORK_MODULE_IDS as readonly string[]).includes("observability"), false)
})

test("旧 #/extensions 书签拆回工作模块或设置发现壳", () => {
  assert.deepEqual(resolveExtensionsLegacyRedirect({ tab: "mcp", preset: "filesystem" }), {
    to: "/mcp",
    search: { preset: "filesystem" }
  })
  assert.deepEqual(resolveExtensionsLegacyRedirect({ tab: "json" }), {
    to: "/mcp",
    search: { tab: "json" }
  })
  assert.deepEqual(resolveExtensionsLegacyRedirect({ tab: "skills", install: "obra-superpowers" }), {
    to: "/skills",
    search: { tab: "curated", install: "obra-superpowers" }
  })
  assert.deepEqual(resolveExtensionsLegacyRedirect({}), {
    to: "/settings/$section",
    params: { section: "extensions" }
  })
})
