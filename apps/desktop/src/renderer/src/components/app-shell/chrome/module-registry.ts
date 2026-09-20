/**
 * 48px 图标轨道目录。工作模块在上，Inbox / Settings 在底部分隔。
 */
import type { ComponentType } from "react"
import {
  RiBookOpenLine,
  RiChat1Line,
  RiFlowChart,
  RiImageLine,
  RiInboxLine,
  RiSettings4Line,
  RiSparklingLine
} from "@remixicon/react"
import { McpIcon } from "../../mcp/components/mcp-brand-icons.ts"
import type { ActivityRailItem, AppModuleId } from "../app-shell.types"

export type ActivityIcon = ComponentType<{
  className?: string
  size?: number | string
  "aria-hidden"?: boolean | "true" | "false"
}>

export const WORK_RAIL_ITEMS: ActivityRailItem[] = [
  { id: "chat", labelKey: "nav.chat", to: "/" },
  { id: "knowledge", labelKey: "nav.knowledge", to: "/knowledge" },
  { id: "workflows", labelKey: "nav.workflows", to: "/workflows" },
  { id: "media", labelKey: "nav.media", to: "/media" },
  { id: "mcp", labelKey: "nav.mcp", to: "/mcp" },
  { id: "skills", labelKey: "nav.skills", to: "/skills" }
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
  mcp: McpIcon,
  skills: RiSparklingLine,
  inbox: RiInboxLine,
  settings: RiSettings4Line
}
