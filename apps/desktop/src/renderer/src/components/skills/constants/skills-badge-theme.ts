/**
 * 技能专属视觉体系与徽标配色系统。
 * 为每个技能包赋予专属的高级色彩梯度、语义图标与高辨识度徽章，对齐 Raycast / App Store / Figma Community 质感。
 */
import type { ComponentType } from "react"
import {
  RiBrainLine,
  RiCodeSSlashLine,
  RiCompass3Line,
  RiFlashlightLine,
  RiFolderLine,
  RiGitRepositoryLine,
  RiLayoutMasonryLine,
  RiPaletteLine,
  RiQuillPenLine,
  RiSparklingLine,
  RiTerminalBoxLine
} from "@remixicon/react"

export type SkillThemeConfig = {
  icon: ComponentType<{ className?: string }>
  badgeBg: string
  badgeText: string
  badgeBorder: string
  accentColor: string
  tagline: string
  verified: boolean
}

const KNOWN_THEMES: Record<string, SkillThemeConfig> = {
  "obra-superpowers": {
    icon: RiFlashlightLine,
    badgeBg: "bg-blue-500/10 dark:bg-blue-500/20",
    badgeText: "text-blue-600 dark:text-blue-400",
    badgeBorder: "border-blue-500/30",
    accentColor: "blue",
    tagline: "主流工程体系：头脑风暴、TDD 循环与代码审查",
    verified: true
  },
  "garrytan-gstack": {
    icon: RiTerminalBoxLine,
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    badgeText: "text-emerald-600 dark:text-emerald-400",
    badgeBorder: "border-emerald-500/30",
    accentColor: "emerald",
    tagline: "现代 Agent 全栈套件：无头网页浏览与自动化测试",
    verified: true
  },
  "pbakaus-impeccable": {
    icon: RiPaletteLine,
    badgeBg: "bg-purple-500/10 dark:bg-purple-500/20",
    badgeText: "text-purple-600 dark:text-purple-400",
    badgeBorder: "border-purple-500/30",
    accentColor: "purple",
    tagline: "反平庸 AI 设计专家：微交互动效与视觉校准",
    verified: true
  },
  "jimliu-baoyu-skills": {
    icon: RiQuillPenLine,
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/20",
    badgeText: "text-amber-600 dark:text-amber-400",
    badgeBorder: "border-amber-500/30",
    accentColor: "amber",
    tagline: "高效创作套件：文章插图、SVG 卡片排版与长文精翻",
    verified: true
  },
  "nextlevelbuilder-ui-ux-pro-max": {
    icon: RiLayoutMasonryLine,
    badgeBg: "bg-rose-500/10 dark:bg-rose-500/20",
    badgeText: "text-rose-600 dark:text-rose-400",
    badgeBorder: "border-rose-500/30",
    accentColor: "rose",
    tagline: "覆盖 50 种高阶设计风格与图表的可视化 UI 专家技能",
    verified: true
  },
  "anthropics-skills": {
    icon: RiBrainLine,
    badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    badgeText: "text-indigo-600 dark:text-indigo-400",
    badgeBorder: "border-indigo-500/30",
    accentColor: "indigo",
    tagline: "Anthropic 官方维护的通用 Agent 工具与范式集合",
    verified: true
  }
}

/** 智能推断技能包的视觉主题 */
export function resolveSkillTheme(idOrName: string, kind?: "git" | "local"): SkillThemeConfig {
  const key = idOrName.toLowerCase()
  for (const [id, config] of Object.entries(KNOWN_THEMES)) {
    if (key.includes(id) || id.includes(key)) {
      return config
    }
  }

  // 根据名称关键词推断
  if (key.includes("design") || key.includes("ui") || key.includes("theme")) {
    return {
      icon: RiPaletteLine,
      badgeBg: "bg-purple-500/10 dark:bg-purple-500/20",
      badgeText: "text-purple-600 dark:text-purple-400",
      badgeBorder: "border-purple-500/30",
      accentColor: "purple",
      tagline: "设计与视觉技能",
      verified: false
    }
  }
  if (key.includes("code") || key.includes("git") || key.includes("dev") || key.includes("test")) {
    return {
      icon: RiCodeSSlashLine,
      badgeBg: "bg-blue-500/10 dark:bg-blue-500/20",
      badgeText: "text-blue-600 dark:text-blue-400",
      badgeBorder: "border-blue-500/30",
      accentColor: "blue",
      tagline: "工程与开发技能",
      verified: false
    }
  }
  if (key.includes("claude")) {
    return {
      icon: RiSparklingLine,
      badgeBg: "bg-orange-500/10 dark:bg-orange-500/20",
      badgeText: "text-orange-600 dark:text-orange-400",
      badgeBorder: "border-orange-500/30",
      accentColor: "orange",
      tagline: "Claude Code 本地技能库",
      verified: true
    }
  }
  if (key.includes("codex")) {
    return {
      icon: RiTerminalBoxLine,
      badgeBg: "bg-sky-500/10 dark:bg-sky-500/20",
      badgeText: "text-sky-600 dark:text-sky-400",
      badgeBorder: "border-sky-500/30",
      accentColor: "sky",
      tagline: "Codex 本地技能库",
      verified: true
    }
  }
  if (key.includes("agent")) {
    return {
      icon: RiCompass3Line,
      badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
      badgeText: "text-cyan-600 dark:text-cyan-400",
      badgeBorder: "border-cyan-500/30",
      accentColor: "cyan",
      tagline: "Standard Agents 本地技能库",
      verified: true
    }
  }

  return {
    icon: kind === "git" ? RiGitRepositoryLine : RiFolderLine,
    badgeBg: "bg-accent-500/10 dark:bg-accent-500/20",
    badgeText: "text-accent-600 dark:text-accent-400",
    badgeBorder: "border-accent-500/30",
    accentColor: "accent",
    tagline: "本地安装技能组",
    verified: false
  }
}

/** 精选集市分类定义 */
export const STORE_CATEGORIES = [
  { id: "all", label: "全部精选", icon: RiSparklingLine },
  { id: "engineering", label: "编程开发", icon: RiCodeSSlashLine },
  { id: "design", label: "UI 视觉", icon: RiPaletteLine },
  { id: "content", label: "内容创作", icon: RiQuillPenLine },
  { id: "utility", label: "效率工具", icon: RiCompass3Line }
] as const
