/**
 * 48px 图标轨道目录。工作模块在上，Inbox / Settings 在底部分隔。
 */
import {
  RiBookOpenLine,
  RiChat1Line,
  RiFlowChart,
  RiImageLine,
  RiInboxLine,
  RiLineChartLine,
  RiPlugLine,
  RiSettings4Line
} from "@remixicon/react"
import type { ActivityRailItem, AppModuleId } from "../app-shell.types"

export type ActivityIcon = typeof RiChat1Line

export const WORK_RAIL_ITEMS: ActivityRailItem[] = [
  { id: "chat", labelKey: "nav.chat", to: "/" },
  { id: "knowledge", labelKey: "nav.knowledge", to: "/knowledge" },
  { id: "workflows", labelKey: "nav.workflows", to: "/workflows" },
  { id: "media", labelKey: "nav.media", to: "/media" },
  { id: "mcp", labelKey: "nav.mcp", to: "/mcp" },
  { id: "observability", labelKey: "nav.observability", to: "/observability" }
]

export const OVERLAY_RAIL_ITEMS: ActivityRailItem[] = [
  { id: "inbox", labelKey: "nav.inbox", to: "/inbox" },
  { id: "settings", labelKey: "common.settings", to: "/settings/general" }
]

export const ACTIVITY_ICONS: Record<AppModuleId, ActivityIcon> = {
  chat: RiChat1Line,
  knowledge: RiBookOpenLine,
  workflows: RiFlowChart,
  media: RiImageLine,
  mcp: RiPlugLine,
  observability: RiLineChartLine,
  inbox: RiInboxLine,
  settings: RiSettings4Line
}
