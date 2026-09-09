/**
 * 审查栏领域模型与类型定义：
 * 涵盖审查作用域（上一轮/未提交/分支等）、视图偏好配置、层级文件树与 Git 提交时间线项。
 */

import type { ChangedFileRow } from "@renderer/stores/chat-store"

/** 审查作用域：对齐 Codex 审查下拉选单 */
export type ReviewScope =
  | "last-turn"    // 上一轮：Agent 最新一轮对话产生的改动
  | "uncommitted"  // 未提交：工作区全部未提交改动
  | "unstaged"     // 未暂存：工作区尚未 git add 的文件
  | "staged"       // 已暂存：工作区已经 git add 的索引文件
  | "commits"      // 已提交：Git 线性历史记录
  | "branch"       // 分支：当前分支与基础分支的整体对比
  | "checkpoints"  // 检查点：Agent 写盘快照，不进用户分支

/** 基础标签分段模式 */
export type ReviewTabMode = "changes" | "commits"

/** Diff 查看模式：连续卡片流 (stream) 或聚焦单文件 (focus) */
export type ReviewDiffViewMode = "stream" | "focus"

/** Diff 渲染模式：统一模式 (unified) 或分栏并排 (split) */
export type ReviewDiffLayoutMode = "unified" | "split"

/** 审查栏偏好配置项（对应 Codex 更多选项与快捷工具） */
export interface ReviewOptions {
  /** 启用自动换行 */
  wordWrap: boolean
  /** 隐藏空白字符变动 */
  hideWhitespace: boolean
  /** 不加载过大文件（超长行或大体积折叠） */
  foldLargeFiles: boolean
  /** 启用富文本/Markdown 预览 */
  richPreview: boolean
  /** 启用行内文字级字符差异 (Word diff) */
  wordDiff: boolean
  /** 是否展开右侧文件树面板 */
  fileTreeVisible: boolean
  /** Diff 布局模式 */
  diffLayout: ReviewDiffLayoutMode
  /** 连续流还是聚焦单文件 */
  viewMode: ReviewDiffViewMode
}

/** 提交时间线节点项（对齐 devl.dev commits 结构） */
export interface CommitListItem {
  /** 唯一标识符 */
  id: string
  /** 完整哈希 */
  hash: string
  /** 7位短哈希 */
  shortHash: string
  /** 提交信息主题 */
  message: string
  /** 提交者姓名 */
  authorName: string
  /** 提交者邮箱 */
  authorEmail?: string
  /** 提交者缩写字母微标 (例如 MO, JL, SB) */
  authorInitials: string
  /** 相对时间描述 (如 "2h ago", "yesterday") */
  relativeTime: string
  /** 变更文件数 */
  filesChanged: number
  /** 新增行数 */
  additions: number
  /** 删除行数 */
  deletions: number
  /** 是否为 Merge 提交 */
  isMerge: boolean
  /** 分支轨道编号 (0: 主干, 1..N: 分支车道，用于绘制多色 SVG 轨道) */
  lane?: number
  /** 附带标签或分支名 (如 "v3.4", "main") */
  tags?: string[]
}

/** 文件树节点：支持嵌套层级与扁平切换 */
export interface FileTreeNode {
  /** 节点唯一键 (通常为相对路径或目录标识) */
  id: string
  /** 显示名称 (目录名或文件名) */
  name: string
  /** 完整工作区相对路径 */
  path: string
  /** 是否为目录文件夹 */
  isDir: boolean
  /** 子节点列表 (若为目录) */
  children?: FileTreeNode[]
  /** Git 状态 */
  status?: ChangedFileRow["status"]
  /** 新增行数 */
  additions?: number
  /** 删除行数 */
  deletions?: number
}
