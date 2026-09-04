/**
 * 设置目录类型。分段 ID 见 settings-sections.ts。
 */
import type { ComponentType } from "react"
import type { SettingsSectionId } from "./settings-sections"

export type { SettingsSectionId }

export type SettingsNavIcon = ComponentType<{
  className?: string
  "aria-hidden"?: boolean | "true" | "false"
}>

export type SettingsNavItem = {
  id: SettingsSectionId
  label: string
  icon: SettingsNavIcon
  keywords: string[]
  soon?: boolean
}

export type SettingsNavGroup = {
  id: string
  label: string
  items: SettingsNavItem[]
}

export type SettingsNavItemDef = {
  id: SettingsSectionId
  labelKey: string
  icon: SettingsNavIcon
  keywords: string[]
}

export type SettingsNavGroupDef = {
  id: string
  labelKey: string
  items: SettingsNavItemDef[]
}
