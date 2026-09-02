/**
 * 模块轨道目录：Chat 与各 Hash 路由。
 */
import {
  RiBookOpenLine,
  RiChat1Line,
  RiFlowChart,
  RiImageLine,
  RiLineChartLine,
  RiPlugLine,
  RiSettings4Line
} from "@remixicon/react"
import type { RailItem } from "./sidebar-module-rails.types"

export const MODULE_RAILS: RailItem[] = [
  { id: "chat", labelKey: "command.newChat", icon: RiChat1Line, to: "/" },
  {
    id: "knowledge",
    labelKey: "nav.knowledge",
    icon: RiBookOpenLine,
    to: "/knowledge",
    matchPrefix: "/knowledge"
  },
  {
    id: "workflows",
    labelKey: "studio.orch.workflowsTitle",
    icon: RiFlowChart,
    to: "/workflows",
    matchPrefix: "/workflows"
  },
  { id: "media", labelKey: "nav.media", icon: RiImageLine, to: "/media", matchPrefix: "/media" },
  { id: "mcp", labelKey: "nav.mcp", icon: RiPlugLine, to: "/mcp", matchPrefix: "/mcp" },
  {
    id: "observability",
    labelKey: "studio.insights.obsTitle",
    icon: RiLineChartLine,
    to: "/observability",
    matchPrefix: "/observability"
  },
  {
    id: "settings",
    labelKey: "common.settings",
    icon: RiSettings4Line,
    to: "/settings/general",
    matchPrefix: "/settings"
  }
]
