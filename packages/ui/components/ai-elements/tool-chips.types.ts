/**
 * Tool Chips 步骤与文件变更胶囊的数据形状。
 */

export type ToolStepKind =
  | "thinking"
  | "write"
  | "edit"
  | "command"
  | "read"
  | "search"
  | "other"

export type ToolStepStatus = "pending" | "running" | "completed" | "error"

export interface ToolStepItem {
  id: string
  kind: ToolStepKind
  title: string
  detail?: string
  additions?: number
  deletions?: number
  status?: ToolStepStatus
}

export interface FileChangeChip {
  path: string
  additions?: number
  deletions?: number
}

export interface ToolChipsProps {
  summaryLabel?: string
  steps?: ToolStepItem[]
  fileChanges?: FileChangeChip[]
  defaultExpanded?: boolean
  /** 嵌进 Thinking 时间线时去掉卡片壳和第二层折叠头。 */
  embedded?: boolean
  onOpenFile?: (path: string) => void
  className?: string
  visibleLimit?: number
}
