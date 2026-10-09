/**
 * 设置情境栏：应用偏好 / 智能体与模型 / 工作区与扩展 / 组织。
 * 组织一级入口是个人资料；团队/账单仍是诚实空态，不占侧栏。
 */
import {
  RiEqualizer3Line,
  RiFileTextLine,
  RiApps2Line,
  RiFolder6Line,
  RiKeyboardBoxLine,
  RiPaletteLine,
  RiPulseLine,
  RiSettings4Line,
  RiShieldKeyholeLine,
  RiSparklingLine,
  RiCursorLine,
  RiScreenshot2Line,
  RiToolsLine,
  RiUser3Line
} from "@remixicon/react"
import { McpIcon } from "../mcp/components/mcp-brand-icons.ts"
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
        keywords: ["mode", "model", "ask", "plan", "approval", "harness", "sandbox", "capabilities", "cli", "cursor", "claude", "grok", "codex", "antigravity", "agy", "acp", "沙箱", "智能体", "内核", "能力", "命令行"]
      },
      {
        id: "tools",
        labelKey: "nav.tools",
        icon: RiToolsLine,
        keywords: ["tools", "browser", "bridge", "computer use", "accessibility", "screen recording", "chrome", "内置工具", "浏览器", "桌面", "权限", "屏幕录制", "辅助功能"]
      },
      {
        id: "computer-use",
        labelKey: "nav.computerUse",
        icon: RiCursorLine,
        metaKey: "nav.beta",
        keywords: ["computer use", "desktop", "accessibility", "电脑操控", "桌面", "指针"]
      },
      {
        id: "appsnap",
        labelKey: "nav.appsnap",
        icon: RiScreenshot2Line,
        metaKey: "nav.beta",
        keywords: ["appsnap", "screenshot", "window", "截图", "窗口"]
      },
      {
        id: "instructions",
        labelKey: "nav.instructions",
        icon: RiFileTextLine,
        keywords: ["prompt", "system", "persona", "customize", "conventions", "agents.md", "说明", "提示词"]
      },
      {
        id: "skills",
        labelKey: "nav.skills",
        icon: RiSparklingLine,
        keywords: ["skill", "skills", "能力包", "技能", "来源组"]
      },
      {
        id: "telemetry",
        labelKey: "nav.telemetry",
        icon: RiPulseLine,
        keywords: ["telemetry", "observability", "traces", "metrics", "tokens", "cost", "logs", "otel", "privacy", "遥测", "可观测性", "指标", "监控", "耗时", "脱敏", "审计"]
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
        keywords: ["folder", "project", "open", "knowledge", "rag", "index", "media", "asset", "项目", "工作区", "知识库", "媒体", "资产"]
      },
      {
        id: "extensions",
        labelKey: "nav.extensions",
        icon: RiApps2Line,
        keywords: ["extensions", "plugins", "mcp", "skills", "扩展", "插件", "技能"]
      },
      {
        id: "mcp",
        labelKey: "nav.mcp",
        icon: McpIcon,
        keywords: ["mcp", "tools", "servers", "automations", "trigger", "telemetry", "git", "工具", "协议", "自动化", "遥测", "版本控制"]
      }
    ]
  },
  {
    id: "org",
    labelKey: "nav.groupOrg",
    items: [
      {
        id: "account",
        labelKey: "nav.account",
        icon: RiUser3Line,
        keywords: ["profile", "avatar", "members", "billing", "plan", "organization", "account", "notifications", "个人", "资料", "团队", "成员", "账单", "公司", "账号", "通知"]
      }
    ]
  }
]
