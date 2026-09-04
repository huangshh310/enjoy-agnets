/**
 * 设置分段 ID 清单。类型由常量推导，避免 types 文件夹常量。
 */
export const SETTINGS_SECTIONS = [
  "general",
  "appearance",
  "shortcuts",
  "providers",
  "agent",
  "instructions",
  "skills",
  "rules",
  "workspace",
  "mcp",
  "git",
  "capabilities",
  "knowledge",
  "media",
  "workflow",
  "automations",
  "telemetry",
  "sandbox",
  "archived",
  "team",
  "members",
  "billing",
  "organization",
  "integrations",
  "account",
  "notifications"
] as const

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]
