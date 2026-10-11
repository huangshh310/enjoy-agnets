/**
 * Composer 本轮改动条的文件行与动作栏入参。
 */
export type SessionReviewFile = {
  path: string
  name: string
  dir: string
  additions: number
  deletions: number
  kind: "file" | "directory"
}

export type SessionReviewActionsProps = {
  busy?: boolean
  hasFiles?: boolean
  canOpenPreview?: boolean
  previewBusy?: boolean
  onUndo: () => void
  onKeep: () => void
  onOpenReview: () => void
  onOpenPreview: () => void
}

export type SessionReviewBarProps = {
  files: SessionReviewFile[]
  running?: boolean
  runStartedAt?: number
  waitingApproval?: boolean
  modelLabel?: string
  onOpenReview: () => void
  onOpenFile: (path: string) => void
  onUndo: () => void
  onKeep: () => void
  onOpenPreview: () => void
  canOpenPreview?: boolean
  previewBusy?: boolean
  busy?: boolean
  hasFiles?: boolean
  /** 本轮写盘才默认展开；工作区脏文件保持折叠。 */
  defaultExpanded?: boolean
  /** 无 path 占位句。写盘 / 命令 / 中断各走自己的键。 */
  placeholderKey?: string
}
