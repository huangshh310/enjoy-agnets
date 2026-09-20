/**
 * 默认 catalog：MCP 内置 presets + skills.sources.curated。
 * 有 IPC 时 curated 失败不回落假列表；无桥才用内置常量。
 */
import { CURATED_SKILL_SOURCES } from "@renderer/components/skills/constants/skills-curated.constants"
import { getFeaturedMcpPresets } from "@renderer/components/mcp/constants/mcp-presets"
import type { TranslateFn } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { EXTENSIONS_CURATED_LIMIT, EXTENSIONS_HUB_MCP_IDS, EXTENSIONS_HUB_SKILL_IDS } from "../constants.ts"
import { pickByIds, projectMcpCurated, projectSkillsCurated } from "../extensions-curated.ts"
import type { CuratedCatalogLoader } from "./curated.types.ts"

export function createDefaultCatalogLoader(t: TranslateFn): CuratedCatalogLoader {
  return {
    async loadMcp() {
      return projectMcpCurated(
        pickByIds(getFeaturedMcpPresets(t), EXTENSIONS_HUB_MCP_IDS),
        EXTENSIONS_CURATED_LIMIT
      )
    },
    async loadSkills() {
      const sources = await loadSkillCatalogSources()
      return projectSkillsCurated(pickByIds(sources, EXTENSIONS_HUB_SKILL_IDS), EXTENSIONS_CURATED_LIMIT)
    }
  }
}

async function loadSkillCatalogSources() {
  if (!hasIde()) return CURATED_SKILL_SOURCES
  const loaded = await getIde().skills.sources.curated()
  if (!Array.isArray(loaded)) throw new Error("CATALOG_UNAVAILABLE")
  return loaded as typeof CURATED_SKILL_SOURCES
}
