/**
 * 精选只读投影：复用 MCP presets / Skills curated，禁止再造 catalog 真源。
 */
import type { ExtensionCuratedCard } from "./extensions.types.ts"

export function pickByIds<T extends { id: string }>(
  items: ReadonlyArray<T>,
  ids: ReadonlyArray<string>
): T[] {
  const index = new Map(items.map((item) => [item.id, item]))
  return ids.flatMap((id) => {
    const hit = index.get(id)
    return hit ? [hit] : []
  })
}

export function projectMcpCurated(
  presets: ReadonlyArray<{
    id: string
    name?: string
    title?: string
    description: string
    transport?: "stdio" | "sse" | "http"
    command?: string
    url?: string
  }>,
  limit?: number
): ExtensionCuratedCard[] {
  const items = typeof limit === "number" ? presets.slice(0, limit) : presets
  return items.map((preset) => ({
    id: preset.id,
    kind: "mcp",
    title: preset.name || preset.title || preset.id,
    description: preset.description,
    transport: preset.transport ?? "stdio",
    command: preset.command,
    url: preset.url
  }))
}

export function projectSkillsCurated(
  sources: ReadonlyArray<{
    id: string
    title: string
    description: string
    locator: string
    name: string
  }>,
  limit?: number
): ExtensionCuratedCard[] {
  const items = typeof limit === "number" ? sources.slice(0, limit) : sources
  return items.map((source) => ({
    id: source.id,
    kind: "skills",
    title: source.title,
    description: source.description,
    locator: source.locator,
    sourceName: source.name
  }))
}
