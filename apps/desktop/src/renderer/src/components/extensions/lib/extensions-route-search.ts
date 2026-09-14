/**
 * 统一扩展模块 Hash 查询参数解析：
 * 支持 tab (marketplace | mcp | skills | json)、preset、install 与 category。
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
