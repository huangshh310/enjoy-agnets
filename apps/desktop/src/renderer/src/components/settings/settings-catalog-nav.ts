/**
 * 设置情境栏分组：应用 / 智能体 / 工作区 / 集成 / 组织 / 账号 / 归档。
 */
import {
  RiBankCardLine,
  RiBankLine,
  RiBookOpenLine,
  RiBox3Line,
  RiEqualizer3Line,
  RiFileTextLine,
  RiFlashlightLine,
  RiFolder6Line,
  RiGitBranchLine,
  RiGroupLine,
  RiImageLine,
  RiInboxArchiveLine,
  RiKeyboardBoxLine,
  RiNotification3Line,
  RiPaletteLine,
  RiPlugLine,
  RiPulseLine,
  RiRouteLine,
  RiSchoolLine,
  RiSettings4Line,
  RiShieldKeyholeLine,
  RiShieldUserLine,
  RiSparkling2Line,
  RiSparklingLine,
  RiTerminalBoxLine
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
        id: "instructions",
        labelKey: "nav.instructions",
        icon: RiFileTextLine,
        keywords: ["prompt", "system", "persona", "customize", "说明"]
      },
      {
        id: "skills",
        labelKey: "nav.skills",
        icon: RiSparklingLine,
        keywords: ["skill", "agents", "markdown", "技能"]
      },
      {
        id: "rules",
        labelKey: "nav.rules",
        icon: RiBookOpenLine,
        keywords: ["cursor", "project", "conventions", "agents.md", "规则"]
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
        id: "automations",
        labelKey: "nav.automations",
        icon: RiFlashlightLine,
        keywords: ["trigger", "on_save", "自动化"]
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
    id: "org",
    labelKey: "nav.groupOrg",
    items: [
      {
        id: "team",
        labelKey: "nav.team",
        icon: RiBankLine,
        keywords: ["profile", "团队"]
      },
      {
        id: "members",
        labelKey: "nav.members",
        icon: RiGroupLine,
        keywords: ["people", "成员"]
      },
      {
        id: "billing",
        labelKey: "nav.billing",
        icon: RiBankCardLine,
        keywords: ["plan", "invoice", "账单"]
      },
      {
        id: "organization",
        labelKey: "nav.organization",
        icon: RiSchoolLine,
        keywords: ["company", "details", "公司"]
      },
      {
        id: "integrations",
        labelKey: "nav.companyIntegrations",
        icon: RiBox3Line,
        keywords: ["slack", "github", "集成"]
      }
    ]
  },
  {
    id: "account",
    labelKey: "nav.groupAccount",
    items: [
      {
        id: "account",
        labelKey: "nav.account",
        icon: RiShieldUserLine,
        keywords: ["profile", "security", "账号"]
      },
      {
        id: "notifications",
        labelKey: "nav.notifications",
        icon: RiNotification3Line,
        keywords: ["push", "email", "通知"]
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
