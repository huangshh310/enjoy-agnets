/**
 * 设置分段目录：id / 图标固定，标签走 i18n。
 */
import {
  RiBookOpenLine,
  RiEqualizer3Line,
  RiFolder6Line,
  RiGitBranchLine,
  RiImageLine,
  RiKeyboardBoxLine,
  RiPaletteLine,
  RiPlugLine,
  RiPulseLine,
  RiRouteLine,
  RiSettings4Line,
  RiShieldKeyholeLine,
  RiSparkling2Line,
  RiInboxArchiveLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { ComponentType } from "react"
import type { TranslateFn } from "@renderer/i18n"

export const SETTINGS_SECTIONS = [
  "general",
  "appearance",
  "shortcuts",
  "providers",
  "agent",
  "workspace",
  "mcp",
  "git",
  "capabilities",
  "knowledge",
  "media",
  "workflow",
  "telemetry",
  "sandbox",
  "archived"
] as const

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]

type IconComponent = ComponentType<{
  className?: string
  "aria-hidden"?: boolean | "true" | "false"
}>

export type SettingsNavItem = {
  id: SettingsSectionId
  label: string
  icon: IconComponent
  keywords: string[]
  soon?: boolean
}

export type SettingsNavGroup = {
  id: string
  label: string
  items: SettingsNavItem[]
}

type NavItemDef = {
  id: SettingsSectionId
  labelKey: string
  icon: IconComponent
  keywords: string[]
}

type NavGroupDef = {
  id: string
  labelKey: string
  items: NavItemDef[]
}

const SETTINGS_NAV_DEF: NavGroupDef[] = [
  {
    id: "app",
    labelKey: "nav.groupApp",
    items: [
      {
        id: "general",
        labelKey: "nav.general",
        icon: RiSettings4Line,
        keywords: ["permissions", "approval", "language", "defaults", "权限", "语言", "通用"]
      },
      {
        id: "appearance",
        labelKey: "nav.appearance",
        icon: RiPaletteLine,
        keywords: ["theme", "dark", "light", "mode", "主题", "外观"]
      },
      {
        id: "shortcuts",
        labelKey: "nav.shortcuts",
        icon: RiKeyboardBoxLine,
        keywords: ["hotkey", "keymap", "command", "快捷键"]
      }
    ]
  },
  {
    id: "agent",
    labelKey: "nav.groupAgent",
    items: [
      {
        id: "providers",
        labelKey: "nav.providers",
        icon: RiShieldKeyholeLine,
        keywords: ["api", "key", "deepseek", "openai", "model", "供应商"]
      },
      {
        id: "agent",
        labelKey: "nav.agent",
        icon: RiEqualizer3Line,
        keywords: ["mode", "model", "ask", "plan", "approval", "harness", "sandbox"]
      },
      {
        id: "capabilities",
        labelKey: "nav.capabilities",
        icon: RiSparkling2Line,
        keywords: ["vision", "tools", "structured", "image", "speech", "能力"]
      },
      {
        id: "workflow",
        labelKey: "nav.workflow",
        icon: RiRouteLine,
        keywords: ["checkpoint", "resume", "durable", "工作流"]
      },
      {
        id: "sandbox",
        labelKey: "nav.sandbox",
        icon: RiTerminalBoxLine,
        keywords: ["cwd", "network", "code mode", "沙箱"]
      }
    ]
  },
  {
    id: "workspace",
    labelKey: "nav.groupWorkspace",
    items: [
      {
        id: "workspace",
        labelKey: "nav.workspace",
        icon: RiFolder6Line,
        keywords: ["folder", "project", "open", "工作区"]
      },
      {
        id: "knowledge",
        labelKey: "nav.knowledge",
        icon: RiBookOpenLine,
        keywords: ["rag", "index", "embed", "知识库"]
      },
      {
        id: "media",
        labelKey: "nav.media",
        icon: RiImageLine,
        keywords: ["image", "speech", "video", "export", "媒体"]
      }
    ]
  },
  {
    id: "integrations",
    labelKey: "nav.groupIntegrations",
    items: [
      {
        id: "mcp",
        labelKey: "nav.mcp",
        icon: RiPlugLine,
        keywords: ["mcp", "tools", "servers"]
      },
      {
        id: "telemetry",
        labelKey: "nav.telemetry",
        icon: RiPulseLine,
        keywords: ["otel", "metrics", "redact", "遥测", "隐私"]
      },
      {
        id: "git",
        labelKey: "nav.git",
        icon: RiGitBranchLine,
        keywords: ["commit", "diff", "branch", "staging"]
      }
    ]
  },
  {
    id: "archived",
    labelKey: "nav.groupArchived",
    items: [
      {
        id: "archived",
        labelKey: "nav.archived",
        icon: RiInboxArchiveLine,
        keywords: ["archive", "chats", "history", "归档"]
      }
    ]
  }
]

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
