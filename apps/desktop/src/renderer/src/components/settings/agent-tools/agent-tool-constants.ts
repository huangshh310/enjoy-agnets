/**
 * Agent 引擎元数据与品牌样式常量
 * 定义各家 CLI 与本地内核的品牌色彩、技术能力胶囊与微角标配置。
 */

/** 供应商 / 模型下拉超过这个数量才出现筛选框。 */
export const BIND_SEARCH_AFTER = 6

/** 配置抽屉宽度。给账号/模型双行和后续字段留空间，不要再锁回 380。 */
export const AGENT_CONFIG_DRAWER_WIDTH_CLASS = "w-[min(36rem,calc(100vw-1.5rem))]"


export interface AgentBrandMeta {
  accentColor: string
  borderColor: string
  haloBg: string
  badgeText?: string
  isTerminalCli?: boolean
}

export const AGENT_BRAND_METAS: Record<string, AgentBrandMeta> = {
  "enjoy-local": {
    accentColor: "text-accent-500",
    borderColor: "border-accent-500/30 hover:border-accent-500/60",
    haloBg: "bg-accent-500/5",
    badgeText: "内置内核",
    isTerminalCli: false
  },
  claude: {
    accentColor: "text-amber-500",
    borderColor: "border-amber-500/30 hover:border-amber-500/60",
    haloBg: "bg-amber-500/5",
    badgeText: "Anthropic",
    isTerminalCli: true
  },
  cursor: {
    accentColor: "text-violet-500",
    borderColor: "border-violet-500/30 hover:border-violet-500/60",
    haloBg: "bg-violet-500/5",
    badgeText: "Anysphere",
    isTerminalCli: true
  },
  grok: {
    accentColor: "text-text-primary",
    borderColor: "border-border-button-default hover:border-border-button-hover",
    haloBg: "bg-background-secondary-default/40",
    badgeText: "xAI",
    isTerminalCli: true
  },
  codex: {
    accentColor: "text-emerald-500",
    borderColor: "border-emerald-500/30 hover:border-emerald-500/60",
    haloBg: "bg-emerald-500/5",
    badgeText: "OpenAI",
    isTerminalCli: true
  },
  antigravity: {
    accentColor: "text-blue-500",
    borderColor: "border-blue-500/30 hover:border-blue-500/60",
    haloBg: "bg-blue-500/5",
    badgeText: "Google",
    isTerminalCli: true
  },
  gemini: {
    accentColor: "text-sky-500",
    borderColor: "border-sky-500/20 hover:border-sky-500/40",
    haloBg: "bg-sky-500/5",
    badgeText: "Google",
    isTerminalCli: true
  },
  opencode: {
    accentColor: "text-orange-500",
    borderColor: "border-orange-500/20 hover:border-orange-500/40",
    haloBg: "bg-orange-500/5",
    badgeText: "SST",
    isTerminalCli: true
  },
  pi: {
    accentColor: "text-rose-500",
    borderColor: "border-rose-500/20 hover:border-rose-500/40",
    haloBg: "bg-rose-500/5",
    badgeText: "Pi",
    isTerminalCli: true
  },
  omp: {
    accentColor: "text-purple-500",
    borderColor: "border-purple-500/20 hover:border-purple-500/40",
    haloBg: "bg-purple-500/5",
    badgeText: "Oh My Pi",
    isTerminalCli: true
  },
  hermes: {
    accentColor: "text-teal-500",
    borderColor: "border-teal-500/20 hover:border-teal-500/40",
    haloBg: "bg-teal-500/5",
    badgeText: "Nous",
    isTerminalCli: true
  },
  amp: {
    accentColor: "text-yellow-500",
    borderColor: "border-yellow-500/20 hover:border-yellow-500/40",
    haloBg: "bg-yellow-500/5",
    badgeText: "Sourcegraph",
    isTerminalCli: true
  },
  deepseek: {
    accentColor: "text-blue-600",
    borderColor: "border-blue-600/20 hover:border-blue-600/40",
    haloBg: "bg-blue-600/5",
    badgeText: "DeepSeek",
    isTerminalCli: true
  }
}

export function getAgentBrandMeta(id: string): AgentBrandMeta {
  if (id.startsWith("custom:")) {
    return {
      accentColor: "text-text-secondary",
      borderColor: "border-border-button-default hover:border-border-button-hover",
      haloBg: "bg-background-secondary-default/40",
      badgeText: "Custom ACP",
      isTerminalCli: true
    }
  }
  return (
    AGENT_BRAND_METAS[id] ?? {
      accentColor: "text-text-secondary",
      borderColor: "border-border-button-default hover:border-border-button-hover",
      haloBg: "bg-background-secondary-default/40",
      badgeText: "CLI",
      isTerminalCli: true
    }
  )
}
