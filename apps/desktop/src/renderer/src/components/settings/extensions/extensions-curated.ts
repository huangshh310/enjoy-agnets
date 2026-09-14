/**
 * 精选只读投影：数据只引用现有 MCP presets 与 Skills curated，禁止再造 catalog。
 */
import type { ComponentType } from "react"
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
  configuredIds: ReadonlySet<string> = new Set(),
  limit?: number
): ExtensionCuratedCard[] {
  const items = typeof limit === "number" ? presets.slice(0, limit) : presets
  return items.map((preset) => ({
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
  installedIds: ReadonlySet<string> = new Set(),
  limit?: number
): ExtensionCuratedCard[] {
  const items = typeof limit === "number" ? sources.slice(0, limit) : sources
  return items.map((source) => ({
    id: source.id,
    kind: "skills",
    title: source.title,
    description: source.description,
    href: skillsInstallHref(source.id),
    category: source.category,
    author: source.author,
    stars: source.stars,
    tags: source.tags,
    badgeColorClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
    sampleTools: source.featuredSkills,
    isConfigured: installedIds.has(source.id)
  }))
}
