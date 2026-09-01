/**
 * MCP UI 视图与交互状态类型定义
 */
import type { ComponentType } from "react"
import type { McpTransport } from "@enjoy-agents/ipc-contract"

/** 页面主 Tab 分组 */
export type McpActiveTab = "servers" | "marketplace" | "json"

/** 插件市场分类 */
export type McpPluginCategory =
  | "all"
  | "storage"
  | "dev"
  | "database"
  | "web"
  | "apps"

/** 插件市场精选预设项 */
export interface McpPluginPreset {
  id: string
  name: string
  category: McpPluginCategory
  categoryLabel: string
  icon: ComponentType<{ className?: string }>
  colorClass: string
  badgeColorClass: string
  description: string
  transport: McpTransport
  command?: string
  url?: string
  envTemplates?: Array<{
    key: string
    description: string
    required: boolean
    placeholder?: string
  }>
  docsUrl?: string
  features: string[]
  sampleTools?: string[]
}

/** 服务器统计数据 */
export interface McpOverviewStats {
  total: number
  connected: number
  trusted: number
  totalTools: number
}

/** 新增/编辑服务器表单状态 */
export interface McpServerFormData {
  id?: string
  name: string
  transport: McpTransport
  command: string
  args: string[]
  url: string
  envEntries: Array<{ key: string; value: string }>
  allowedResourceUris: string[]
  modelVisibleTools: string[]
  appOnlyTools: string[]
  trusted: boolean
}

/** 单个工具带权限状态 */
export interface McpToolWithPermission {
  name: string
  description?: string
  inputSchema?: unknown
  permissionLevel: "allow" | "ask" | "deny"
  isModelVisible: boolean
}
