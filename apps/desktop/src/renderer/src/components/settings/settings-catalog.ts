/**
 * 设置分段 ID 与目录装配。分组定义见 settings-catalog-nav.ts。
 */
import type { TranslateFn } from "@renderer/i18n"
import { SETTINGS_NAV_DEF } from "./settings-catalog-nav"
import type { SettingsNavGroup, SettingsNavItem, SettingsSectionId } from "./settings-catalog.types"
import { SETTINGS_SECTIONS } from "./settings-sections"

export { SETTINGS_SECTIONS }
export type { SettingsNavGroup, SettingsNavItem, SettingsSectionId }

export function getSettingsNav(t: TranslateFn): SettingsNavGroup[] {
  return SETTINGS_NAV_DEF.map((group) => ({
    id: group.id,
    label: t(group.labelKey),
    items: group.items.map((item) => ({
      id: item.id,
      label: t(item.labelKey),
      icon: item.icon,
      keywords: item.keywords
    }))
  }))
}

export function isSettingsSectionId(value: string): value is SettingsSectionId {
  return (SETTINGS_SECTIONS as readonly string[]).includes(value)
}

export function findSettingsItem(
  id: SettingsSectionId,
  nav: SettingsNavGroup[]
): SettingsNavItem | undefined {
  return nav.flatMap((group) => group.items).find((item) => item.id === id)
}
