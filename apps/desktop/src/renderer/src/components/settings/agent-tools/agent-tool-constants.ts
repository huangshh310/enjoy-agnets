/**
 * Agent 引擎元数据与品牌样式常量
 * 定义各家 CLI 与本地内核的品牌色彩、技术能力胶囊与微角标配置。
 */

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
    badgeText: "即将推出",
    capabilities: [{ label: "规划中", code: "P1" }],
    tagline: "Google Gemini 官方终端支持，即将发布。",
    isTerminalCli: true
  },
  opencode: {
    accentColor: "text-orange-500",
    borderColor: "border-orange-500/20 hover:border-orange-500/40",
    haloBg: "bg-orange-500/5",
    badgeText: "开源社区",
    capabilities: [{ label: "开源协议", code: "Open Source" }],
    tagline: "开源社区自托管模型编码智能体支持。",
    isTerminalCli: true
  },
  pi: {
    accentColor: "text-rose-500",
    borderColor: "border-rose-500/20 hover:border-rose-500/40",
    haloBg: "bg-rose-500/5",
    badgeText: "个人助理",
    capabilities: [{ label: "自然语言对话", code: "Conversational" }],
    tagline: "Inflection Pi 拟人化自然语言智能体。",
    isTerminalCli: false
  },
  omp: {
    accentColor: "text-purple-500",
    borderColor: "border-purple-500/20 hover:border-purple-500/40",
    haloBg: "bg-purple-500/5",
    badgeText: "Oh My Pi",
    capabilities: [{ label: "技能根目录", code: "Skills Root" }],
    tagline: "Oh My Pi 核心技能集合体，非独立执行进程。",
    isTerminalCli: false
  },
  hermes: {
    accentColor: "text-teal-500",
    borderColor: "border-teal-500/20 hover:border-teal-500/40",
    haloBg: "bg-teal-500/5",
    badgeText: "即将推出",
    capabilities: [{ label: "轻量自研架构", code: "Hermes Core" }],
    tagline: "轻量化智能体工作流引擎。",
    isTerminalCli: false
  },
  amp: {
    accentColor: "text-yellow-500",
    borderColor: "border-yellow-500/20 hover:border-yellow-500/40",
    haloBg: "bg-yellow-500/5",
    badgeText: "实验特性",
    capabilities: [{ label: "协议加速", code: "Accelerator" }],
    tagline: "分布式 Agent 执行与协作加速网关。",
    isTerminalCli: false
  },
  deepseek: {
    accentColor: "text-blue-600",
    borderColor: "border-blue-600/20 hover:border-blue-600/40",
    haloBg: "bg-blue-600/5",
    badgeText: "深度求索",
    capabilities: [{ label: "深度思考模型", code: "R1 Reasoning" }],
    tagline: "DeepSeek 官方开源模型原生推理体系。",
    isTerminalCli: false
  }
}

export function getAgentBrandMeta(id: string): AgentBrandMeta {
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
