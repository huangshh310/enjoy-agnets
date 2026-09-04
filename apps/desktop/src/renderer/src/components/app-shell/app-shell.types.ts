/**
 * AppShell 模块 ID：工作模块可被 Escape 记为「上次工位」；Inbox / Settings 是叠加模块。
 */
export const WORK_MODULE_IDS = [
  "chat",
  "knowledge",
  "workflows",
  "media",
  "mcp",
  "skills",
  "observability"
] as const

export const OVERLAY_MODULE_IDS = ["inbox", "settings"] as const

export type WorkModuleId = (typeof WORK_MODULE_IDS)[number]
export type OverlayModuleId = (typeof OVERLAY_MODULE_IDS)[number]
export type AppModuleId = WorkModuleId | OverlayModuleId

export type ActivityRailItem = {
  id: AppModuleId
  labelKey: string
  to: string
}
