/**
 * 精选只读投影：数据只引用现有 MCP presets 与 Skills curated，禁止再造 catalog。
 */
import type { ComponentType } from "react"
import { EXTENSIONS_CURATED_LIMIT } from "./constants.ts"
import { mcpPresetHref, skillsInstallHref } from "./extensions-hrefs.ts"
import type { ExtensionCuratedCard } from "./extensions.types.ts"

export function projectMcpCurated(
  presets: ReadonlyArray<{
    id: string
    name?: string
    title?: string
    description: string
    category?: string
    categoryLabel?: string
    icon?: ComponentType<{ className?: string }>
    colorClass?: string
    badgeColorClass?: string
    sampleTools?: string[]
  }>,
  configuredIds: ReadonlySet<string> = new Set()
): ExtensionCuratedCard[] {
  return presets.slice(0, EXTENSIONS_CURATED_LIMIT).map((preset) => ({
    id: preset.id,
    kind: "mcp",
    title: preset.name || preset.title || preset.id,
    description: preset.description,
    href: mcpPresetHref(preset.id),
    category: preset.category,
    categoryLabel: preset.categoryLabel,
    icon: preset.icon,
    colorClass: preset.colorClass,
    badgeColorClass: preset.badgeColorClass,
    sampleTools: preset.sampleTools,
    isConfigured: configuredIds.has(preset.id)
  }))
}

export function projectSkillsCurated(
  sources: ReadonlyArray<{
    id: string
    title: string
    description: string
    category?: string
    author?: string
    stars?: number
    tags?: string[]
    featuredSkills?: string[]
  }>,
  installedIds: ReadonlySet<string> = new Set()
): ExtensionCuratedCard[] {
  return sources.slice(0, EXTENSIONS_CURATED_LIMIT).map((source) => ({
    id: source.id,
    kind: "skills",
    title: source.title,
    description: source.description,
    href: skillsInstallHref(source.id),
    category: source.category,
    author: source.author,
    stars: source.stars,
    tags: source.tags,
    sampleTools: source.featuredSkills,
    isConfigured: installedIds.has(source.id)
  }))
}
