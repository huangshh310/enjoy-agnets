/**
 * 扩展发现壳常量：深链 hash 与列 id。
 * 发现壳，权威配置仍是 #/mcp 与 #/skills，本页不新开存储。
 */

export const EXTENSIONS_SECTION_ID = "extensions" as const

export const EXTENSIONS_COLUMNS = ["mcp", "skills"] as const
export type ExtensionsColumnId = (typeof EXTENSIONS_COLUMNS)[number]

/** 与视觉真源两列示意密度对齐；完整精选仍在 #/mcp / #/skills。 */
export const EXTENSIONS_CURATED_LIMIT = 3

export const EXTENSIONS_HUB_MCP_IDS = ["filesystem", "github", "postgres"] as const
export const EXTENSIONS_HUB_SKILL_IDS = [
  "obra-superpowers",
  "pbakaus-impeccable",
  "anthropics-skills"
] as const

export const MCP_HUB_HREF = "#/mcp"
export const SKILLS_HUB_HREF = "#/skills"
export const EXTENSIONS_HUB_HREF = "#/settings/extensions"

export const EXTENSIONS_FORBIDDEN_TERMS = [
  "Registry",
  "本机 CLI",
  "ACP",
  "stdio",
  "Marketplace",
  "Store"
] as const
