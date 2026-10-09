/**
 * Agent 专属整备舱 (Armory) 常量与各目标 Agent 运行时元数据。
 */
import type { ComponentType } from "react"
import type { SkillTargetId } from "@enjoy-agents/ipc-contract"
import {
  AmpTargetIcon,
  AntigravityTargetIcon,
  ClaudeTargetIcon,
  CodexTargetIcon,
  CursorTargetIcon,
  DeepSeekTargetIcon,
  EnjoyTargetIcon,
  GeminiTargetIcon,
  GrokTargetIcon,
  HermesTargetIcon,
  OmpTargetIcon,
  OpenCodeTargetIcon,
  PiTargetIcon,
  createDynamicTargetIcon
} from "./agent-armory-icons"

export interface AgentArmoryProfile {
  targetId: SkillTargetId
  name: string
  shortName: string
  badgeText: string
  description: string
  protocol: string
  runtimeEnv: string
  icon: ComponentType<{ className?: string }>
  themeColor: {
    bg: string
    border: string
    text: string
    glow: string
    pillBg: string
  }
  tags: string[]
  recommendedCuratedIds: string[]
  suggestedSkillNames: string[]
}

export const AGENT_ARMORY_PROFILES: Partial<Record<SkillTargetId, AgentArmoryProfile>> = {
  pi: {
    targetId: "pi",
    name: "Pi 极速推理助手",
    shortName: "Pi",
    badgeText: "Lightweight Agent",
    description: "专为轻量化、极速流式响应与最小化执行周期设计的本地高敏捷 Agent，原生契约化支持 Markdown 指令规范与 POSIX 终端增强。",
    protocol: "Markdown Spec + Shell Execution (SKILL.md v2.1)",
    runtimeEnv: "~/.pi/agent/skills/ & 本地工作区",
    icon: PiTargetIcon,
    themeColor: {
      bg: "bg-status-yellow-background/10",
      border: "border-status-yellow-text/30",
      text: "text-status-yellow-text dark:text-status-yellow-text",
      glow: "shadow-amber-500/10",
      pillBg: "bg-status-yellow-background/15"
    },
    tags: ["极速响应", "TDD 开发", "架构决策", "Shell 自治"],
    recommendedCuratedIds: ["obra-superpowers", "garrytan-gstack", "pbakaus-impeccable"],
    suggestedSkillNames: ["brainstorming", "tdd", "code-review", "adapt", "audit", "diagnosing-bugs"]
  },
  claude: {
    targetId: "claude",
    name: "Claude Code 终端助理",
    shortName: "Claude",
    badgeText: "Full-Stack Reasoning",
    description: "Anthropic 官方旗舰编程智能体，擅长超长上下文分析、复杂工程重构、多文件一致性治理与自主任务规划。",
    protocol: "Claude Agent Tools + Extended Prompting",
    runtimeEnv: "~/.claude/skills/ & .claude/rules/",
    icon: ClaudeTargetIcon,
    themeColor: {
      bg: "bg-status-yellow-background/10",
      border: "border-status-yellow-text/30",
      text: "text-status-yellow-text dark:text-status-yellow-text",
      glow: "shadow-orange-500/10",
      pillBg: "bg-status-yellow-background/15"
    },
    tags: ["深度重构", "多文件治理", "长上下文", "工程规范"],
    recommendedCuratedIds: ["anthropics-skills", "obra-superpowers", "jimliu-baoyu-skills"],
    suggestedSkillNames: ["code-review", "brainstorming", "better-auth-best-practices", "codebase-design"]
  },
  cursor: {
    targetId: "cursor",
    name: "Cursor IDE 智能协同",
    shortName: "Cursor",
    badgeText: "Editor Native",
    description: "深度融入现代 IDE 交互的感知型 Agent，支持工作区持久化规则 (.cursorrules) 与多文件即时编辑投影。",
    protocol: "Cursor Rules & Subagent Orchestration",
    runtimeEnv: "~/.cursor/skills/ & .cursor/rules/",
    icon: CursorTargetIcon,
    themeColor: {
      bg: "bg-accent-500/10",
      border: "border-accent-500/30",
      text: "text-accent-500 dark:text-accent-500",
      glow: "shadow-blue-500/10",
      pillBg: "bg-accent-500/15"
    },
    tags: ["代码补全", "规则约束", "IDE 协同", "即时 Diff"],
    recommendedCuratedIds: ["nextlevelbuilder-ui-ux-pro-max", "pbakaus-impeccable", "obra-superpowers"],
    suggestedSkillNames: ["design-taste-frontend", "polish", "react-modernization", "nextjs"]
  },
  codex: {
    targetId: "codex",
    name: "Codex 自动化执行体",
    shortName: "Codex",
    badgeText: "Deterministic Executor",
    description: "具备高确定性代码生成与受控沙盒执行能力的 Agent，精通微服务架构、并发编程与标准化 API 调用。",
    protocol: "Codex Function Calling & Standard Sandbox",
    runtimeEnv: "~/.codex/skills/ & 运行沙箱",
    icon: CodexTargetIcon,
    themeColor: {
      bg: "bg-state-success-text/10",
      border: "border-state-success-text/30",
      text: "text-state-success-text dark:text-state-success-text",
      glow: "shadow-state-success-text/10",
      pillBg: "bg-state-success-text/15"
    },
    tags: ["沙箱执行", "自动化流水线", "API 编排", "确定性输出"],
    recommendedCuratedIds: ["garrytan-gstack", "obra-superpowers", "anthropics-skills"],
    suggestedSkillNames: ["test", "build", "diagnosing-bugs", "golang-pro"]
  },
  "enjoy-agents": {
    targetId: "enjoy-agents",
    name: "Enjoy Agents 原生内核",
    shortName: "Enjoy",
    badgeText: "Platform Core",
    description: "基于 Vercel AI SDK 7 架构构建的桌面原生引擎，内置智能安全审批、资产流水线与流式思考导轨。",
    protocol: "Vercel AI SDK 7 ToolLoopAgent + StreamEvent v2",
    runtimeEnv: "~/.enjoy-agents/skills/ & 核心运行时",
    icon: EnjoyTargetIcon,
    themeColor: {
      bg: "bg-accent-500/10",
      border: "border-accent-500/30",
      text: "text-accent-600 dark:text-accent-400",
      glow: "shadow-accent-500/10",
      pillBg: "bg-accent-500/15"
    },
    tags: ["全功能支持", "人工审批", "知识库 RAG", "多模态资产"],
    recommendedCuratedIds: ["obra-superpowers", "pbakaus-impeccable", "jimliu-baoyu-skills"],
    suggestedSkillNames: ["brainstorming", "tdd", "impeccable", "baoyu-article-illustrator"]
  },
  omp: {
    targetId: "omp",
    name: "Oh My Pi (OMP) 工程线",
    shortName: "OMP",
    badgeText: "Harness Fleet",
    description: "专为复杂生产环境定制的高敏捷工程师 Harness，支持多智能体广播协同、长时间持久化任务与分布式工具中继。",
    protocol: "OMP Fleet IRC + Subagent IPC Protocol",
    runtimeEnv: "~/.omp/skills/ & 协作网络",
    icon: OmpTargetIcon,
    themeColor: {
      bg: "bg-chart-1/10",
      border: "border-chart-1/30",
      text: "text-chart-1 dark:text-chart-1",
      glow: "shadow-cyan-500/10",
      pillBg: "bg-chart-1/15"
    },
    tags: ["多智能体协同", "长任务管理", "分布式中继", "工具编排"],
    recommendedCuratedIds: ["obra-superpowers", "garrytan-gstack", "anthropics-skills"],
    suggestedSkillNames: ["dispatching-parallel-agents", "autopilot", "systematic-debugging"]
  },
  grok: {
    targetId: "grok",
    name: "Grok Build 自治体",
    shortName: "Grok",
    badgeText: "Autonomous Build",
    description: "xAI 打造的高效终端协同编码体，具备强推理分析与敏捷任务规划，支持标准 stdio 与 ACP 宿主协议。",
    protocol: "xAI CLI & Agent Protocol",
    runtimeEnv: "~/.grok/skills/ & 运行沙箱",
    icon: GrokTargetIcon,
    themeColor: {
      bg: "bg-background-secondary-default/10",
      border: "border-separator-border/30",
      text: "text-text-secondary dark:text-text-secondary",
      glow: "shadow-slate-500/10",
      pillBg: "bg-background-secondary-default/15"
    },
    tags: ["高效构建", "任务规划", "自治推理"],
    recommendedCuratedIds: ["obra-superpowers", "garrytan-gstack"],
    suggestedSkillNames: ["code-review", "tdd", "diagnosing-bugs"]
  },
  antigravity: {
    targetId: "antigravity",
    name: "Antigravity 高阶结对体",
    shortName: "Antigravity",
    badgeText: "Advanced Agentic Coding",
    description: "Google DeepMind 高级编码助手，深度集成规则、技能与 MCP 工具体系，支持按需加载与上下文渐进式披露。",
    protocol: "Antigravity Skill Spec + MCP Protocol",
    runtimeEnv: "~/.gemini/antigravity/skills/ & 本地工作区",
    icon: AntigravityTargetIcon,
    themeColor: {
      bg: "bg-accent-500/10",
      border: "border-accent-500/30",
      text: "text-accent-500 dark:text-accent-500",
      glow: "shadow-indigo-500/10",
      pillBg: "bg-accent-500/15"
    },
    tags: ["深度结对", "渐进披露", "MCP 集成", "架构治理"],
    recommendedCuratedIds: ["pbakaus-impeccable", "obra-superpowers", "garrytan-gstack"],
    suggestedSkillNames: ["codebase-design", "brainstorming", "tdd", "domain-modeling"]
  },
  gemini: {
    targetId: "gemini",
    name: "Gemini CLI 终端助理",
    shortName: "Gemini",
    badgeText: "Multimodal Agent",
    description: "基于 Google Gemini 原生大模型生态的多模态工程智能体，支持长文本推理与跨文件感知。",
    protocol: "Google Gemini ACP Mode",
    runtimeEnv: "~/.gemini/skills/ & 系统终端",
    icon: GeminiTargetIcon,
    themeColor: {
      bg: "bg-accent-500/10",
      border: "border-accent-500/30",
      text: "text-accent-500 dark:text-accent-500",
      glow: "shadow-blue-500/10",
      pillBg: "bg-accent-500/15"
    },
    tags: ["多模态理解", "超长上下文", "Google 生态"],
    recommendedCuratedIds: ["anthropics-skills", "obra-superpowers"],
    suggestedSkillNames: ["code-review", "diagnosing-bugs"]
  },
  opencode: {
    targetId: "opencode",
    name: "OpenCode 协作终端",
    shortName: "OpenCode",
    badgeText: "Community Driven",
    description: "开源高人气的交互式 TUI 编程智能体，原生支持按需技能挂载、灵活权限沙箱与细粒度工具策略。",
    protocol: "OpenCode ACP & Skill Registry",
    runtimeEnv: "~/.config/opencode/skills/ & 工作区",
    icon: OpenCodeTargetIcon,
    themeColor: {
      bg: "bg-state-success-text/10",
      border: "border-state-success-text/30",
      text: "text-state-success-text dark:text-state-success-text",
      glow: "shadow-state-success-text/10",
      pillBg: "bg-state-success-text/15"
    },
    tags: ["开源生态", "TUI 交互", "安全沙箱"],
    recommendedCuratedIds: ["garrytan-gstack", "obra-superpowers"],
    suggestedSkillNames: ["tdd", "code-review", "autopilot"]
  },
  hermes: {
    targetId: "hermes",
    name: "Hermes 自治智能体",
    shortName: "Hermes",
    badgeText: "Nous Research",
    description: "由 Nous Research 打造的开放权重与前沿推理 Agent，具备强大的工具调用与自主排错能力。",
    protocol: "Hermes ACP Protocol",
    runtimeEnv: "~/.hermes/skills/ & 运行环境",
    icon: HermesTargetIcon,
    themeColor: {
      bg: "bg-chart-5/10",
      border: "border-chart-5/30",
      text: "text-chart-5 dark:text-chart-5",
      glow: "shadow-purple-500/10",
      pillBg: "bg-chart-5/15"
    },
    tags: ["开源权重", "函数调用", "研究前沿"],
    recommendedCuratedIds: ["obra-superpowers", "pbakaus-impeccable"],
    suggestedSkillNames: ["diagnosing-bugs", "systematic-debugging"]
  },
  amp: {
    targetId: "amp",
    name: "Amp 敏捷编程体",
    shortName: "Amp",
    badgeText: "High Velocity",
    description: "极速响应的现代化命令行助手，专为高频迭代与即时编辑反馈设计。",
    protocol: "Amp ACP Protocol",
    runtimeEnv: "~/.amp/skills/ & 系统环境",
    icon: AmpTargetIcon,
    themeColor: {
      bg: "bg-background-tertiary-error/10",
      border: "border-border-error-default/30",
      text: "text-text-error-primary dark:text-text-error-primary",
      glow: "shadow-text-error-primary/10",
      pillBg: "bg-background-tertiary-error/15"
    },
    tags: ["极速迭代", "代码生成", "敏捷开发"],
    recommendedCuratedIds: ["garrytan-gstack", "obra-superpowers"],
    suggestedSkillNames: ["code-review", "tdd"]
  },
  deepseek: {
    targetId: "deepseek",
    name: "DeepSeek 深度推理体",
    shortName: "DeepSeek",
    badgeText: "Deep Reasoning",
    description: "搭载 DeepSeek 深度思考内核的原生 CLI 智能体，精通复杂算法设计、代码正确性形式化论证与严谨架构验证。",
    protocol: "DeepSeek ACP Profile",
    runtimeEnv: "~/.deepseek/skills/ & 运行沙箱",
    icon: DeepSeekTargetIcon,
    themeColor: {
      bg: "bg-accent-500/10",
      border: "border-accent-500/30",
      text: "text-accent-500 dark:text-accent-500",
      glow: "shadow-blue-600/10",
      pillBg: "bg-accent-500/15"
    },
    tags: ["深度思考", "算法攻坚", "形式化论证", "架构设计"],
    recommendedCuratedIds: ["obra-superpowers", "garrytan-gstack", "anthropics-skills"],
    suggestedSkillNames: ["diagnosing-bugs", "systematic-debugging", "codebase-design"]
  }
}

export function getAgentArmoryProfile(targetId: SkillTargetId): AgentArmoryProfile {
  return (
    AGENT_ARMORY_PROFILES[targetId] ?? {
      targetId: targetId as SkillTargetId,
      name: `${targetId.toUpperCase()} 助手`,
      shortName: targetId,
      badgeText: "Custom Agent",
      description: "通用 Agent 目标环境，支持标准化技能包文件同步与调用映射。",
      protocol: "Standard Skill Spec",
      runtimeEnv: `~/.${targetId}/skills/`,
      icon: createDynamicTargetIcon(targetId),
      themeColor: {
        bg: "bg-background-secondary-default",
        border: "border-separator-border",
        text: "text-text-primary",
        glow: "shadow-2xs",
        pillBg: "bg-background-secondary-default"
      },
      tags: ["通用集成", "能力同步"],
      recommendedCuratedIds: ["obra-superpowers", "garrytan-gstack"],
      suggestedSkillNames: ["brainstorming", "code-review"]
    }
  )
}

