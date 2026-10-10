/**
 * 纯函数：审查栏是否处于「装饰应关闭」的空态（供 hook 与 node:test 共用）。
 */
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import type { EnjoyCheckpointItem } from "@enjoy-agents/ipc-contract"
import type { CommitListItem } from "./views/review/types/review.types"
import type { ReviewScope } from "./views/review/types/review.types"
import { filterChangesByScope } from "./views/review/filter-review-changes"

export function isReviewDecorEmpty(input: {
  reviewActive: boolean
  reviewScope: ReviewScope
  changes: ChangedFileRow[]
  lastTurnPaths: string[]
  branchFiles: ChangedFileRow[]
  commits: CommitListItem[]
  checkpoints: EnjoyCheckpointItem[]
}): boolean {
  if (!input.reviewActive) return false
  if (input.reviewScope === "checkpoints") return input.checkpoints.length === 0
  if (input.reviewScope === "commits") return input.commits.length === 0
  const scoped = filterChangesByScope(
    input.changes,
    input.reviewScope,
    input.lastTurnPaths,
    input.branchFiles
  )
  return scoped.length === 0
}

export function shouldRightPaneShellFrost(input: {
  emptyPicker: boolean
  reviewActive: boolean
  reviewDecorEmpty: boolean
}): boolean {
  if (input.emptyPicker) return false
  if (input.reviewActive && input.reviewDecorEmpty) return false
  return true
}
