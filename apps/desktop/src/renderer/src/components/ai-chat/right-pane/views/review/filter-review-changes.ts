/**
 * 按审查作用域过滤变更。分支对比把上游...HEAD 与工作区改动按路径合并。
 */

import type { ChangedFileRow } from "@renderer/stores/chat-store"
import type { ReviewScope } from "./types/review.types"

export function filterChangesByScope(
  changes: ChangedFileRow[],
  scope: ReviewScope,
  lastTurnPaths: string[],
  branchFiles: ChangedFileRow[]
): ChangedFileRow[] {
  if (scope === "commits") return []
  if (scope === "unstaged") {
    return changes.filter((file) => file.worktree || file.status === "untracked")
  }
  if (scope === "staged") {
    return changes.filter((file) => file.staged)
  }
  if (scope === "last-turn") {
    const set = new Set(lastTurnPaths)
    return changes.filter((file) => set.has(file.path))
  }
  if (scope === "branch") {
    return mergeByPath(branchFiles, changes)
  }
  return changes
}

function mergeByPath(branchFiles: ChangedFileRow[], working: ChangedFileRow[]): ChangedFileRow[] {
  const map = new Map<string, ChangedFileRow>()
  for (const file of branchFiles) map.set(file.path, file)
  for (const file of working) map.set(file.path, file)
  return [...map.values()]
}
