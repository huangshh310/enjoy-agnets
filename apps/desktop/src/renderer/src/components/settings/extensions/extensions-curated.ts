/**
 * 精选只读投影：数据只引用现有 MCP presets 与 Skills curated，禁止再造 catalog。
 */
import { EXTENSIONS_CURATED_LIMIT } from "./constants.ts"
import { mcpPresetHref, skillsInstallHref } from "./extensions-hrefs.ts"
import type { ExtensionCuratedCard } from "./extensions.types.ts"

export function projectMcpCurated(
  presets: ReadonlyArray<{ id: string; name: string; description: string }>
): ExtensionCuratedCard[] {
  return presets.slice(0, EXTENSIONS_CURATED_LIMIT).map((preset) => ({
    id: preset.id,
    title: preset.name,
    description: preset.description,
    href: mcpPresetHref(preset.id)
  }))
}

export function projectSkillsCurated(
  sources: ReadonlyArray<{ id: string; title: string; description: string }>
): ExtensionCuratedCard[] {
  return sources.slice(0, EXTENSIONS_CURATED_LIMIT).map((source) => ({
    id: source.id,
    title: source.title,
    description: source.description,
    href: skillsInstallHref(source.id)
  }))
}
