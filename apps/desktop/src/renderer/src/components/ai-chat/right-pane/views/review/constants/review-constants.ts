/**
 * 审查栏业务常量表：
 * 包含审查作用域选项、Git 状态配置、多色分支车道配色方案、Conventional Commit 前缀以及偏好配置默认值。
 */

import type { ReviewOptions, ReviewScope } from "../types/review.types"
import type { ChangedFileRow } from "@renderer/stores/chat-store"

/** 默认审查视图偏好配置 */
export const DEFAULT_REVIEW_OPTIONS: ReviewOptions = {
  wordWrap: false,
  hideWhitespace: false,
  foldLargeFiles: true,
  richPreview: true,
  wordDiff: true,
  fileTreeVisible: true,
  diffLayout: "unified",
  viewMode: "stream"
}

/** 审查作用域下拉选单配置列表 (对齐 Codex 审查作用域) */
export const REVIEW_SCOPES: Array<{
  id: ReviewScope
  label: string
  desc: string
}> = [
  { id: "last-turn", label: "上一轮", desc: "查看当前对话最新一轮 Agent 产生的改动" },
  { id: "uncommitted", label: "未提交", desc: "查看工作区全部未提交的代码修改" },
  { id: "unstaged", label: "未暂存", desc: "查看尚未加入暂存区的修改" },
  { id: "staged", label: "已暂存", desc: "查看已经暂存就绪准备提交的代码" },
  { id: "commits", label: "已提交", desc: "查看工作区线性的 Git 提交历史记录" },
  { id: "branch", label: "分支", desc: "查看当前工作分支与基础分支的整体差异" },
  { id: "checkpoints", label: "检查点", desc: "Agent 写盘快照，还原不移动当前分支" }
]

/** Git 状态标记字母、色彩与语义类名 */
export const STATUS_CONFIG: Record<
  ChangedFileRow["status"],
  {
    mark: string
    tone: string
    bgTone: string
    label: string
  }
> = {
  added: {
    mark: "A",
    tone: "text-state-success-text",
    bgTone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    label: "新增"
  },
  modified: {
    mark: "M",
    tone: "text-accent-500",
    bgTone: "bg-accent-500/10 text-accent-500 border-accent-500/20",
    label: "修改"
  },
  deleted: {
    mark: "D",
    tone: "text-text-error-primary",
    bgTone: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    label: "删除"
  },
  untracked: {
    mark: "U",
    tone: "text-amber-500",
    bgTone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    label: "未跟踪"
  }
}

/** devl.dev 风格分支多色 SVG 轨道色彩序列 */
export const BRANCH_LANE_COLORS = [
  "#6366f1", // 主干 Indigo
  "#14b8a6", // 功能分支 Teal
  "#f472b6", // 修复分支 Pink
  "#f59e0b", // 发布分支 Amber
  "#38bdf8", // 探索分支 Sky
  "#a855f7"  // 特别分支 Purple
] as const

/** 根据名字字符串确定性计算作者微标背景色 */
export const AUTHOR_COLOR_PALETTES = [
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
  "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/25",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25",
  "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25"
] as const

/** 常用 Conventional Commit 规范前缀推荐芯片 */
export const CONVENTIONAL_PREFIXES = [
  { prefix: "feat: ", label: "feat", desc: "新功能特性" },
  { prefix: "fix: ", label: "fix", desc: "缺陷修复" },
  { prefix: "refactor: ", label: "refactor", desc: "代码重构" },
  { prefix: "chore: ", label: "chore", desc: "例行维护" },
  { prefix: "docs: ", label: "docs", desc: "文档更新" }
] as const
