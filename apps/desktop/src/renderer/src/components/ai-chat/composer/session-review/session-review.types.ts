/**
 * Composer 本轮改动条的文件行与动作栏入参。
 */
export type SessionReviewFile = {
  path: string
  name: string
  dir: string
  additions: number
  deletions: number
}

export type SessionReviewActionsProps = {
  busy?: boolean
  hasFiles?: boolean
  onUndo: () => void
  onKeep: () => void
  onOpenReview: () => void
}

export type SessionReviewBarProps = {
  files: SessionReviewFile[]
  running?: boolean
  runStartedAt?: number
  modelLabel?: string
  onOpenReview: () => void
  onOpenFile: (path: string) => void
  onUndo: () => void
  onKeep: () => void
  busy?: boolean
  hasFiles?: boolean
}
