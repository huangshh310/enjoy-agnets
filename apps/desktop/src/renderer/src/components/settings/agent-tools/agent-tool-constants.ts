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
  capabilities: Array<{
    label: string
    code: string
  }>
  tagline: string
  isTerminalCli?: boolean
}

export const AGENT_BRAND_METAS: Record<string, AgentBrandMeta> = {
  "enjoy-local": {
    accentColor: "text-accent-500",
    borderColor: "border-accent-500/30 hover:border-accent-500/60",
    haloBg: "bg-accent-500/5",
    badgeText: "内置内核",
    capabilities: [
      { label: "原生双向流", code: "ToolLoop" },
      { label: "全量多模型", code: "Providers" },
      { label: "本地沙箱工具", code: "Sandbox" },
      { label: "智能审批", code: "HMAC" }
    ],
    tagline: "Enjoy 本地原生内核，开箱即用，支持多供应商模型自由组装。",
    isTerminalCli: false
  },
  claude: {
    accentColor: "text-amber-500",
    borderColor: "border-amber-500/30 hover:border-amber-500/60",
    haloBg: "bg-amber-500/5",
    badgeText: "Anthropic",
    capabilities: [
      { label: "原生 ACP 传输", code: "ACP Stdio" },
      { label: "深度思考链", code: "Thinking" },
      { label: "终端 Shell 工具", code: "Bash Exec" },
      { label: "工作区 Diff", code: "File Edit" }
    ],
    tagline: "Anthropic 官方编码与推理智能体，具备自主执行与深度思考能力。",
    isTerminalCli: true
  },
  cursor: {
    accentColor: "text-violet-500",
    borderColor: "border-violet-500/30 hover:border-violet-500/60",
    haloBg: "bg-violet-500/5",
    badgeText: "Anysphere",
    capabilities: [
      { label: "ACP 协议通道", code: "ACP Host" },
      { label: "极速代码补全", code: "Fast Edit" },
      { label: "代码库多文件索引", code: "Codebase" }
    ],
    tagline: "Cursor 官方终端 CLI，结合其强大的代码库索引与快速变更能力。",
    isTerminalCli: true
  },
  grok: {
    accentColor: "text-text-primary",
    borderColor: "border-border-button-default hover:border-border-button-hover",
    haloBg: "bg-background-secondary-default/40",
    badgeText: "xAI",
    capabilities: [
      { label: "ACP 协议通道", code: "ACP Stdio" },
      { label: "并行子智能体", code: "Subagents" },
      { label: "本机 TUI / 无头", code: "Grok Build" }
    ],
    tagline: "xAI Grok Build 终端智能体，官方 ACP stdio，登录 SuperGrok / X Premium+。",
    isTerminalCli: true
  },
  codex: {
    accentColor: "text-emerald-500",
    borderColor: "border-emerald-500/30 hover:border-emerald-500/60",
    haloBg: "bg-emerald-500/5",
    badgeText: "OpenAI",
    capabilities: [
      { label: "ACP 协议通道", code: "ACP Stdio" },
      { label: "多轮复杂规划", code: "Planner" },
      { label: "沙箱运行环境", code: "Sandbox" }
    ],
    tagline: "OpenAI Codex 终端智能体，擅长架构设计、测试驱动与任务分解。",
    isTerminalCli: true
  },
  antigravity: {
    accentColor: "text-blue-500",
    borderColor: "border-blue-500/30 hover:border-blue-500/60",
    haloBg: "bg-blue-500/5",
    badgeText: "Google",
    capabilities: [
      { label: "ACP 协议桥接", code: "agy-acp" },
      { label: "超长上下文推理", code: "Long Context" },
      { label: "原生多模态输入", code: "Multimodal" }
    ],
    tagline: "Google Antigravity 智能体，支持长上下文理解与深度复杂推理。",
    isTerminalCli: true
  },
  gemini: {
    accentColor: "text-sky-500",
    borderColor: "border-sky-500/20 hover:border-sky-500/40",
    haloBg: "bg-sky-500/5",
    badgeText: "Google",
    capabilities: [{ label: "官方 ACP", code: "gemini --acp" }],
    tagline: "Google Gemini CLI 官方 ACP。免费档请用 Antigravity。",
    isTerminalCli: true
  },
  opencode: {
    accentColor: "text-orange-500",
    borderColor: "border-orange-500/20 hover:border-orange-500/40",
    haloBg: "bg-orange-500/5",
    badgeText: "SST",
    capabilities: [{ label: "官方 ACP", code: "opencode acp" }],
    tagline: "OpenCode 官方 ACP stdio。登录用 opencode auth login。",
    isTerminalCli: true
  },
  pi: {
    accentColor: "text-rose-500",
    borderColor: "border-rose-500/20 hover:border-rose-500/40",
    haloBg: "bg-rose-500/5",
    badgeText: "Pi",
    capabilities: [{ label: "ACP 适配器", code: "pi-acp" }],
    tagline: "Pi 官方协议是 RPC；Enjoy 经社区 pi-acp 说话。",
    isTerminalCli: true
  },
  omp: {
    accentColor: "text-purple-500",
    borderColor: "border-purple-500/20 hover:border-purple-500/40",
    haloBg: "bg-purple-500/5",
    badgeText: "Oh My Pi",
    capabilities: [{ label: "官方 ACP", code: "omp acp" }],
    tagline: "Oh My Pi 是完整编码智能体，官方 ACP 子命令 omp acp。",
    isTerminalCli: true
  },
  hermes: {
    accentColor: "text-teal-500",
    borderColor: "border-teal-500/20 hover:border-teal-500/40",
    haloBg: "bg-teal-500/5",
    badgeText: "Nous",
    capabilities: [{ label: "官方 ACP", code: "hermes acp" }],
    tagline: "Hermes Agent 官方 ACP。首次使用跑 hermes acp --setup。",
    isTerminalCli: true
  },
  amp: {
    accentColor: "text-yellow-500",
    borderColor: "border-yellow-500/20 hover:border-yellow-500/40",
    haloBg: "bg-yellow-500/5",
    badgeText: "Sourcegraph",
    capabilities: [{ label: "ACP 适配器", code: "amp-acp" }],
    tagline: "Amp 官方 CLI 没有 amp acp；Enjoy 走 Registry 适配器 amp-acp。",
    isTerminalCli: true
  },
  deepseek: {
    accentColor: "text-blue-600",
    borderColor: "border-blue-600/20 hover:border-blue-600/40",
    haloBg: "bg-blue-600/5",
    badgeText: "DeepSeek",
    capabilities: [{ label: "官方 ACP", code: "dsh --profile acp" }],
    tagline: "DeepSeek Harness 官方 ACP profile。需要 DEEPSEEK_API_KEY。",
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
      capabilities: [{ label: "ACP Stdio", code: "custom" }],
      tagline: "用户添加的 stdio ACP agent。审批不豁免。",
      isTerminalCli: true
    }
  }
  return (
    AGENT_BRAND_METAS[id] ?? {
      accentColor: "text-text-secondary",
      borderColor: "border-border-button-default hover:border-border-button-hover",
      haloBg: "bg-background-secondary-default/40",
      badgeText: "CLI",
      capabilities: [{ label: "标准接口", code: "Stdio" }],
      tagline: "本机已安装的外部开发智能体 CLI 工具。",
      isTerminalCli: true
    }
  )
}
