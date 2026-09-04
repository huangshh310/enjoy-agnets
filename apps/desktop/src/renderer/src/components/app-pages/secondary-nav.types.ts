/**
 * 情境栏导航分组：Settings / MCP / Knowledge 等共用。
 */
import type { ComponentType } from "react"

export type SecondaryNavIcon = ComponentType<{
  className?: string
  "aria-hidden"?: boolean | "true" | "false"
}>

export type SecondaryNavItem = {
  id: string
  label: string
  icon: SecondaryNavIcon
  keywords?: string[]
  meta?: string
}

export type SecondaryNavGroup = {
  id: string
  label: string
  items: SecondaryNavItem[]
}
