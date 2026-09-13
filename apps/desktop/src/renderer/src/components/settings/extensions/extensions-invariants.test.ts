/**
 * 扩展发现壳不变量：导航、深链、禁词、工作模块轨不加第八项。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { WORK_MODULE_IDS } from "../../app-shell/app-shell.types.ts"
import { FEATURED_MCP_PRESETS } from "../../mcp/constants/mcp-presets.ts"
import { CURATED_SKILL_SOURCES } from "../../skills/constants/skills-curated.constants.ts"
import { SETTINGS_NAV_DEF } from "../settings-catalog-nav.ts"
import { SETTINGS_SECTIONS } from "../settings-sections.ts"
import { zh } from "../../../i18n/catalogs/zh/index.ts"
import { en } from "../../../i18n/catalogs/en/index.ts"
import { EXTENSIONS_FORBIDDEN_TERMS, MCP_HUB_HREF, SKILLS_HUB_HREF } from "./constants.ts"
import { projectMcpCurated, projectSkillsCurated } from "./extensions-curated.ts"
import { mcpHubHref, mcpPresetHref, skillsHubHref, skillsInstallHref } from "./extensions-hrefs.ts"

test("工作区组含 extensions，且 MCP 仍在", () => {
  const group = SETTINGS_NAV_DEF.find((item) => item.id === "workspace")
  assert.ok(group)
  const ids = group.items.map((item) => item.id)
  assert.ok(ids.includes("extensions"))
  assert.ok(ids.includes("workspace"))
  assert.ok(ids.includes("mcp"))
  assert.ok(SETTINGS_SECTIONS.includes("extensions"))
})

test("添加与精选卡 href 指向现有 #/mcp / #/skills", () => {
  assert.equal(mcpHubHref(), `${MCP_HUB_HREF}?tab=marketplace`)
  assert.equal(skillsHubHref(), `${SKILLS_HUB_HREF}?tab=curated`)
  assert.equal(mcpPresetHref("filesystem"), "#/mcp?tab=marketplace&preset=filesystem")
  assert.equal(skillsInstallHref("obra-superpowers"), "#/skills?tab=curated&install=obra-superpowers")
  const mcpCards = projectMcpCurated(FEATURED_MCP_PRESETS)
  const skillCards = projectSkillsCurated(CURATED_SKILL_SOURCES)
  assert.ok(mcpCards.length >= 4 && mcpCards.length <= 6)
  assert.ok(skillCards.length >= 4 && skillCards.length <= 6)
  for (const card of mcpCards) {
    assert.ok(card.href.startsWith("#/mcp"))
    assert.ok(card.href.includes("preset="))
  }
  for (const card of skillCards) {
    assert.ok(card.href.startsWith("#/skills"))
    assert.ok(card.href.includes("install="))
  }
})

test("扩展页 copy 不含 Registry、本机 CLI、ACP、stdio", () => {
  const blob = JSON.stringify({ zh: zh.settings.extensions, en: en.settings.extensions })
  for (const term of EXTENSIONS_FORBIDDEN_TERMS) {
    assert.equal(blob.includes(term), false, `forbidden: ${term}`)
  }
})

test("WORK_MODULE_IDS 仍为七项且不含 extensions", () => {
  assert.deepEqual([...WORK_MODULE_IDS], [
    "chat",
    "knowledge",
    "workflows",
    "media",
    "mcp",
    "skills",
    "observability"
  ])
  assert.equal((WORK_MODULE_IDS as readonly string[]).includes("extensions"), false)
})
