/**
 * Skills 工作模块 Hash 查询：扩展页精选卡带 tab + install。
 */

export type SkillsRouteSearch = {
  tab?: "curated" | "skills" | "packs"
  install?: string
  from?: "settings"
  section?: string
}

function asTab(value: unknown): SkillsRouteSearch["tab"] {
  if (value === "curated" || value === "skills" || value === "packs") return value
  return undefined
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function parseSkillsSearch(search: Record<string, unknown>): SkillsRouteSearch {
  return {
    tab: asTab(search.tab),
    install: asOptionalString(search.install),
    from: search.from === "settings" ? "settings" : undefined,
    section: asOptionalString(search.section)
  }
}
