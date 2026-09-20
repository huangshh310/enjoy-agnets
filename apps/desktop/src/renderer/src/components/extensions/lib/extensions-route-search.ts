/**
 * 旧 #/extensions Hash 查询：只给书签拆回 #/mcp / #/skills / 设置发现壳。
 */

export type ExtensionsRouteTab = "marketplace" | "mcp" | "skills" | "json"

export type ExtensionsRouteSearch = {
  tab?: ExtensionsRouteTab
  preset?: string
  install?: string
  category?: string
}

export function parseExtensionsSearch(search: Record<string, unknown>): ExtensionsRouteSearch {
  const tabRaw = typeof search.tab === "string" ? search.tab.toLowerCase() : undefined
  let tab: ExtensionsRouteTab | undefined
  if (tabRaw === "marketplace" || tabRaw === "mcp" || tabRaw === "skills" || tabRaw === "json") {
    tab = tabRaw
  } else if (tabRaw === "servers") {
    tab = "mcp"
  } else if (tabRaw === "curated") {
    tab = "marketplace"
  }

  return {
    tab,
    preset: typeof search.preset === "string" && search.preset.trim() ? search.preset.trim() : undefined,
    install: typeof search.install === "string" && search.install.trim() ? search.install.trim() : undefined,
    category: typeof search.category === "string" && search.category.trim() ? search.category.trim() : undefined
  }
}
