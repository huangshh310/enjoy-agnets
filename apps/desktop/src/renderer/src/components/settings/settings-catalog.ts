/**
 * 设置分段 ID 与目录装配。分组定义见 settings-catalog-nav.ts。
 */
import {
  RiBankCardLine,
  RiBankLine,
  RiBookOpenLine,
  RiBox3Line,
  RiApps2Line,
  RiEqualizer3Line,
  RiFileTextLine,
  RiFlashlightLine,
  RiFolder6Line,
  RiGitBranchLine,
  RiGroupLine,
  RiImageLine,
  RiInboxArchiveLine,
  RiKeyboardBoxLine,
  RiNotification3Line,
  RiPaletteLine,
  RiPulseLine,
  RiRouteLine,
  RiSchoolLine,
  RiSettings4Line,
  RiShieldKeyholeLine,
  RiShieldUserLine,
  RiSparkling2Line,
  RiSparklingLine,
  RiTerminalBoxLine,
  RiCursorLine,
  RiScreenshot2Line,
  RiToolsLine
} from "@remixicon/react"
import { McpIcon } from "../mcp/components/mcp-brand-icons.ts"
import type { TranslateFn } from "@renderer/i18n"
import { SETTINGS_NAV_DEF } from "./settings-catalog-nav"
import type { SettingsNavGroup, SettingsNavItem, SettingsSectionId, SettingsNavIcon } from "./settings-catalog.types"

export { SETTINGS_SECTIONS, isSettingsSectionId } from "./settings-sections"
export { resolveActiveNavSectionId } from "./settings-nav-resolve"
export type { SettingsNavGroup, SettingsNavItem, SettingsSectionId }

export function getSettingsNav(t: TranslateFn): SettingsNavGroup[] {
  return SETTINGS_NAV_DEF.map((group) => ({
    id: group.id,
    label: t(group.labelKey),
    items: group.items.map((item) => ({
      id: item.id,
      label: t(item.labelKey),
      icon: item.icon,
      keywords: item.keywords,
      meta: item.metaKey ? t(item.metaKey) : undefined
    }))
  }))
}

const ALL_SECTION_META: Record<SettingsSectionId, { labelKey: string; icon: SettingsNavIcon }> = {
  general: { labelKey: "nav.general", icon: RiSettings4Line },
  appearance: { labelKey: "nav.appearance", icon: RiPaletteLine },
  shortcuts: { labelKey: "nav.shortcuts", icon: RiKeyboardBoxLine },
  providers: { labelKey: "nav.providers", icon: RiShieldKeyholeLine },
  agent: { labelKey: "nav.agent", icon: RiEqualizer3Line },
  tools: { labelKey: "nav.tools", icon: RiToolsLine },
  "computer-use": { labelKey: "nav.computerUse", icon: RiCursorLine },
  appsnap: { labelKey: "nav.appsnap", icon: RiScreenshot2Line },
  instructions: { labelKey: "nav.instructions", icon: RiFileTextLine },
  skills: { labelKey: "nav.skills", icon: RiSparklingLine },
  rules: { labelKey: "nav.rules", icon: RiBookOpenLine },
  capabilities: { labelKey: "nav.capabilities", icon: RiSparkling2Line },
  workflow: { labelKey: "nav.workflow", icon: RiRouteLine },
  sandbox: { labelKey: "nav.sandbox", icon: RiTerminalBoxLine },
  workspace: { labelKey: "nav.workspace", icon: RiFolder6Line },
  extensions: { labelKey: "nav.extensions", icon: RiApps2Line },
  knowledge: { labelKey: "nav.knowledge", icon: RiBookOpenLine },
  media: { labelKey: "nav.media", icon: RiImageLine },
  mcp: { labelKey: "nav.mcp", icon: McpIcon },
  automations: { labelKey: "nav.automations", icon: RiFlashlightLine },
  telemetry: { labelKey: "nav.telemetry", icon: RiPulseLine },
  git: { labelKey: "nav.git", icon: RiGitBranchLine },
  team: { labelKey: "nav.team", icon: RiBankLine },
  members: { labelKey: "nav.members", icon: RiGroupLine },
  billing: { labelKey: "nav.billing", icon: RiBankCardLine },
  organization: { labelKey: "nav.organization", icon: RiSchoolLine },
  integrations: { labelKey: "nav.companyIntegrations", icon: RiBox3Line },
  account: { labelKey: "nav.account", icon: RiShieldUserLine },
  notifications: { labelKey: "nav.notifications", icon: RiNotification3Line },
  archived: { labelKey: "nav.archived", icon: RiInboxArchiveLine }
}

export function findSettingsItem(
  id: SettingsSectionId,
  nav: SettingsNavGroup[]
): SettingsNavItem | undefined {
  const found = nav.flatMap((group) => group.items).find((item) => item.id === id)
  if (found) return found
  const meta = ALL_SECTION_META[id]
  if (!meta) return undefined
  return {
    id,
    label: meta.labelKey, // 在未国际化包装时由消费者翻译，或直接传递
    icon: meta.icon,
    keywords: []
  }
}
