/**
 * 扩展发现与生态中心视图模型类型。
 */
import type { ComponentType } from "react"

export type ExtensionsColumnId = "mcp" | "skills"
export type ExtensionKind = "mcp" | "skills"

export type ExtensionCuratedCard = {
  id: string
  kind: ExtensionKind
  title: string
  description: string
  href: string
  category?: string
  categoryLabel?: string
  author?: string
  stars?: number
  icon?: ComponentType<{ className?: string }>
  colorClass?: string
  badgeColorClass?: string
  tags?: string[]
  sampleTools?: string[]
  isConfigured?: boolean
}

export type ExtensionsColumnModel = {
  id: ExtensionsColumnId
  title: string
  countLabel: string
  addHref: string
  addLabel: string
  cards: ExtensionCuratedCard[]
}

export type ExtensionsFilterTab = "all" | "mcp" | "skills"
export type ExtensionsCategoryFilter = "all" | "storage" | "dev" | "database" | "web" | "design" | "content"
