/**
 * 旧 #/extensions?tab= 书签：MCP / Skills 回工作模块，其余进设置发现壳。
 */
import {
  parseExtensionsSearch,
  type ExtensionsRouteSearch
} from "../../extensions/lib/extensions-route-search.ts"

export type ExtensionsLegacyTarget =
  | { to: "/mcp"; search: { tab?: "json"; preset?: string } }
  | { to: "/skills"; search: { tab: "curated"; install?: string } }
  | { to: "/settings/$section"; params: { section: "extensions" } }

export function resolveExtensionsLegacyRedirect(
  search: Record<string, unknown> | ExtensionsRouteSearch
): ExtensionsLegacyTarget {
  const parsed = parseExtensionsSearch(search as Record<string, unknown>)
  if (parsed.tab === "mcp" || parsed.tab === "json") {
    return {
      to: "/mcp",
      search: {
        ...(parsed.tab === "json" ? { tab: "json" as const } : {}),
        ...(parsed.preset ? { preset: parsed.preset } : {})
      }
    }
  }
  if (parsed.tab === "skills") {
    return {
      to: "/skills",
      search: {
        tab: "curated",
        ...(parsed.install ? { install: parsed.install } : {})
      }
    }
  }
  return {
    to: "/settings/$section",
    params: { section: "extensions" }
  }
}
