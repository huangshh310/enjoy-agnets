/**
 * 精选只读投影：数据只引用现有 MCP presets 与 Skills curated，禁止再造 catalog。
 */
import { mcpPresetHref, skillsInstallHref } from "./extensions-hrefs.ts"
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
  }>,
  limit?: number
): ExtensionCuratedCard[] {
  const items = typeof limit === "number" ? presets.slice(0, limit) : presets
  return items.map((preset) => ({
    id: preset.id,
    kind: "mcp",
    title: preset.name || preset.title || preset.id,
    description: preset.description,
    href: mcpPresetHref(preset.id)
  }))
}

export function projectSkillsCurated(
  sources: ReadonlyArray<{
    id: string
    title: string
    description: string
  }>,
  limit?: number
): ExtensionCuratedCard[] {
  const items = typeof limit === "number" ? sources.slice(0, limit) : sources
  return items.map((source) => ({
    id: source.id,
    kind: "skills",
    title: source.title,
    description: source.description,
    href: skillsInstallHref(source.id)
  }))
}
