/**
 * 扩展发现壳常量：深链 hash 与列 id。
 * 权威配置仍是 #/mcp 与 #/skills，本页不新开存储。
 */

export const EXTENSIONS_SECTION_ID = "extensions" as const

export const EXTENSIONS_COLUMNS = ["mcp", "skills"] as const
export type ExtensionsColumnId = (typeof EXTENSIONS_COLUMNS)[number]

export const EXTENSIONS_CURATED_LIMIT = 6

export const MCP_HUB_HREF = "#/mcp"
export const SKILLS_HUB_HREF = "#/skills"

export const EXTENSIONS_FORBIDDEN_TERMS = ["Registry", "本机 CLI", "ACP", "stdio"] as const
