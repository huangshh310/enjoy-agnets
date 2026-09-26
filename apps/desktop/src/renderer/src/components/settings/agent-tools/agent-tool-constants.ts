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
    accentColor: "text-status-yellow-text",
    borderColor: "border-status-yellow-text/30 hover:border-status-yellow-text/60",
    haloBg: "bg-status-yellow-background/5",
    badgeText: "Anthropic",
    isTerminalCli: true
  },
  cursor: {
    accentColor: "text-chart-5",
    borderColor: "border-chart-5/30 hover:border-chart-5/60",
    haloBg: "bg-chart-5/5",
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
    accentColor: "text-state-success-text",
    borderColor: "border-state-success-text/30 hover:border-state-success-text/60",
    haloBg: "bg-state-success-text/5",
    badgeText: "OpenAI",
    isTerminalCli: true
  },
  antigravity: {
    accentColor: "text-accent-500",
    borderColor: "border-accent-500/30 hover:border-accent-500/60",
    haloBg: "bg-accent-500/5",
    badgeText: "Google",
    isTerminalCli: true
  },
  gemini: {
    accentColor: "text-accent-500",
    borderColor: "border-accent-500/20 hover:border-accent-500/40",
    haloBg: "bg-accent-500/5",
    badgeText: "Google",
    isTerminalCli: true
  },
  opencode: {
    accentColor: "text-status-yellow-text",
    borderColor: "border-status-yellow-text/20 hover:border-status-yellow-text/40",
    haloBg: "bg-status-yellow-background/5",
    badgeText: "SST",
    isTerminalCli: true
  },
  pi: {
    accentColor: "text-text-error-primary",
    borderColor: "border-border-error-default/20 hover:border-border-error-default/40",
    haloBg: "bg-background-tertiary-error/5",
    badgeText: "Pi",
    isTerminalCli: true
  },
  omp: {
    accentColor: "text-chart-5",
    borderColor: "border-chart-5/20 hover:border-chart-5/40",
    haloBg: "bg-chart-5/5",
    badgeText: "Oh My Pi",
    isTerminalCli: true
  },
  hermes: {
    accentColor: "text-chart-1",
    borderColor: "border-chart-1/20 hover:border-chart-1/40",
    haloBg: "bg-chart-1/5",
    badgeText: "Nous",
    isTerminalCli: true
  },
  amp: {
    accentColor: "text-status-yellow-text",
    borderColor: "border-status-yellow-text/20 hover:border-status-yellow-text/40",
    haloBg: "bg-status-yellow-background/5",
    badgeText: "Sourcegraph",
    isTerminalCli: true
  },
  deepseek: {
    accentColor: "text-accent-500",
    borderColor: "border-accent-500/20 hover:border-accent-500/40",
    haloBg: "bg-accent-500/5",
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
