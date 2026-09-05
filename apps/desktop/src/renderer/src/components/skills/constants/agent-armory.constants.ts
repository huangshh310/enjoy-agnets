/**
 * Agent 专属整备舱 (Armory) 常量与各目标 Agent 运行时元数据。
 */
import type { ComponentType } from "react"
import {
  RiCodeSSlashLine,
  RiCompass3Line,
  RiCpuLine,
  RiFlashlightLine,
  RiRobot2Line,
  RiSparklingLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { SkillTargetId } from "@enjoy-agents/ipc-contract"

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
    icon: RiFlashlightLine,
    themeColor: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
      glow: "shadow-amber-500/10",
      pillBg: "bg-amber-500/15"
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
    icon: RiSparklingLine,
    themeColor: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-600 dark:text-purple-400",
      glow: "shadow-purple-500/10",
      pillBg: "bg-purple-500/15"
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
    icon: RiCodeSSlashLine,
    themeColor: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-600 dark:text-blue-400",
      glow: "shadow-blue-500/10",
      pillBg: "bg-blue-500/15"
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
    icon: RiTerminalBoxLine,
    themeColor: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-400",
      glow: "shadow-emerald-500/10",
      pillBg: "bg-emerald-500/15"
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
    icon: RiRobot2Line,
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
    icon: RiCpuLine,
    themeColor: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      text: "text-cyan-600 dark:text-cyan-400",
      glow: "shadow-cyan-500/10",
      pillBg: "bg-cyan-500/15"
    },
    tags: ["多智能体协同", "长任务管理", "分布式中继", "工具编排"],
    recommendedCuratedIds: ["obra-superpowers", "garrytan-gstack", "anthropics-skills"],
    suggestedSkillNames: ["dispatching-parallel-agents", "autopilot", "systematic-debugging"]
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
      icon: RiCompass3Line,
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
