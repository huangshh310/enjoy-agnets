import {
  RiEqualizer3Line,
  RiFolder6Line,
  RiGitBranchLine,
  RiKeyboardBoxLine,
  RiPaletteLine,
  RiPlugLine,
  RiSettings4Line,
  RiShieldKeyholeLine
} from "@remixicon/react"
import type { ComponentType } from "react"

export const SETTINGS_SECTIONS = [
  "general",
  "appearance",
  "shortcuts",
  "providers",
  "agent",
  "workspace",
  "mcp",
  "git"
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

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    id: "app",
    label: "App",
    items: [
      {
        id: "general",
        label: "General",
        icon: RiSettings4Line,
        keywords: ["permissions", "approval", "language", "defaults"]
      },
      {
        id: "appearance",
        label: "Appearance",
        icon: RiPaletteLine,
        keywords: ["theme", "dark", "light", "mode"]
      },
      {
        id: "shortcuts",
        label: "Keyboard shortcuts",
        icon: RiKeyboardBoxLine,
        keywords: ["hotkey", "keymap", "command"]
      }
    ]
  },
  {
    id: "agent",
    label: "Agent",
    items: [
      {
        id: "providers",
        label: "Providers",
        icon: RiShieldKeyholeLine,
        keywords: ["api", "key", "deepseek", "openai", "model"]
      },
      {
        id: "agent",
        label: "Agent",
        icon: RiEqualizer3Line,
        keywords: ["mode", "model", "ask", "plan", "approval", "permissions", "harness", "claude", "sandbox"]
      }
    ]
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        id: "workspace",
        label: "Workspace",
        icon: RiFolder6Line,
        keywords: ["folder", "project", "open"]
      }
    ]
  },
  {
    id: "integrations",
    label: "Integrations",
    items: [
      {
        id: "mcp",
        label: "MCP",
        icon: RiPlugLine,
        keywords: ["mcp", "tools", "servers"],
        soon: true
      },
      {
        id: "git",
        label: "Git",
        icon: RiGitBranchLine,
        keywords: ["commit", "diff", "branch"],
        soon: true
      }
    ]
  }
]

export function isSettingsSectionId(value: string): value is SettingsSectionId {
  return (SETTINGS_SECTIONS as readonly string[]).includes(value)
}

export function findSettingsItem(id: SettingsSectionId): SettingsNavItem | undefined {
  return SETTINGS_NAV.flatMap((group) => group.items).find((item) => item.id === id)
}
