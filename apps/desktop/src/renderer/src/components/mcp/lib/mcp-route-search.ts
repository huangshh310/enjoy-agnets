/**
 * MCP 工作模块 Hash 查询：扩展页精选卡带 tab + preset。
 */

export type McpRouteSearch = {
  tab?: "servers" | "marketplace" | "json"
  preset?: string
  from?: "settings"
  section?: string
}

function asTab(value: unknown): McpRouteSearch["tab"] {
  if (value === "servers" || value === "marketplace" || value === "json") return value
  return undefined
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function parseMcpSearch(search: Record<string, unknown>): McpRouteSearch {
  return {
    tab: asTab(search.tab),
    preset: asOptionalString(search.preset),
    from: search.from === "settings" ? "settings" : undefined,
    section: asOptionalString(search.section)
  }
}
