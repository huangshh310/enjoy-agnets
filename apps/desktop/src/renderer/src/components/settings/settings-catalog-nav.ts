/**
 * 设置情境栏精炼分组：应用偏好 / 智能体与模型 / 工作区与扩展 / 团队与账户 (4大组9个核心项)。
 * 告别24项长列表截断，所有子路由与关键词均保持100%全覆盖映射。
 */
import {
  RiEqualizer3Line,
  RiFolder6Line,
  RiGroupLine,
  RiKeyboardBoxLine,
  RiPaletteLine,
  RiPlugLine,
  RiSettings4Line,
  RiShieldKeyholeLine,
  RiSparklingLine
} from "@remixicon/react"
import type { SettingsNavGroupDef } from "./settings-catalog.types"

export const SETTINGS_NAV_DEF: SettingsNavGroupDef[] = [
  {
    id: "app",
    labelKey: "nav.groupApp",
    items: [
      {
        id: "general",
        labelKey: "nav.general",
        icon: RiSettings4Line,
        keywords: ["permissions", "approval", "language", "defaults", "权限", "语言", "通用", "自动放行"]
      },
      {
        id: "appearance",
        labelKey: "nav.appearance",
        icon: RiPaletteLine,
        keywords: ["theme", "dark", "light", "mode", "skin", "glass", "classic", "ink", "sketch", "主题", "外观", "皮肤"]
      },
      {
        id: "shortcuts",
        labelKey: "nav.shortcuts",
        icon: RiKeyboardBoxLine,
        keywords: ["hotkey", "keymap", "command", "快捷键", "按键"]
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
        keywords: ["api", "key", "deepseek", "openai", "claude", "ollama", "model", "供应商", "模型", "密钥"]
      },
      {
        id: "agent",
        labelKey: "nav.agent",
        icon: RiEqualizer3Line,
        keywords: ["mode", "model", "ask", "plan", "approval", "harness", "sandbox", "capabilities", "沙箱", "智能体", "内核", "能力"]
      },
      {
        id: "instructions",
        labelKey: "nav.instructions",
        icon: RiSparklingLine,
        keywords: ["prompt", "system", "persona", "customize", "skill", "skills", "rules", "conventions", "agents.md", "说明", "技能", "规则", "提示词"]
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
        keywords: ["folder", "project", "open", "knowledge", "rag", "index", "media", "asset", "工作区", "知识库", "媒体", "资产"]
      },
      {
        id: "mcp",
        labelKey: "nav.mcp",
        icon: RiPlugLine,
        keywords: ["mcp", "tools", "servers", "automations", "trigger", "telemetry", "git", "工具", "协议", "自动化", "遥测", "版本控制"]
      }
    ]
  },
  {
    id: "org",
    labelKey: "nav.groupOrg",
    items: [
      {
        id: "team",
        labelKey: "nav.team",
        icon: RiGroupLine,
        keywords: ["profile", "members", "billing", "plan", "organization", "account", "notifications", "团队", "成员", "账单", "公司", "账号", "通知"]
      }
    ]
  }
]
