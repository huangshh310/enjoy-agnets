/**
 * 按审查作用域过滤变更。分支对比把上游...HEAD 与工作区改动按路径合并。
 */

import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { normalizeReviewPath, sameReviewPath } from "./same-review-path.ts"
import type { ReviewScope } from "./types/review.types"

export function filterChangesByScope(
  changes: ChangedFileRow[],
  scope: ReviewScope,
  lastTurnPaths: string[],
  branchFiles: ChangedFileRow[]
): ChangedFileRow[] {
  if (scope === "commits" || scope === "checkpoints") return []
  if (scope === "unstaged") {
    return changes.filter((file) => file.worktree || file.status === "untracked")
  }
  if (scope === "staged") {
    return changes.filter((file) => file.staged)
  }
  if (scope === "last-turn") {
    return rowsForLastTurn(changes, lastTurnPaths)
  }
  if (scope === "branch") {
    return mergeByPath(branchFiles, changes)
  }
  return changes
}

/** 上一轮写盘 path 即使不在 git status 里也要列出，避免条上 10 个文件、审查栏空白。 */
function rowsForLastTurn(changes: ChangedFileRow[], lastTurnPaths: string[]): ChangedFileRow[] {
  if (lastTurnPaths.length === 0) return []
  const used: Record<string, true> = {}
  const rows: ChangedFileRow[] = []
  for (const raw of lastTurnPaths) {
    const path = normalizeReviewPath(raw)
    if (!path) continue
    const hit = changes.find((row) => sameReviewPath(row.path, path))
    const row = hit ?? { path, status: "modified" as const, additions: 0, deletions: 0 }
    if (used[row.path]) continue
    used[row.path] = true
    rows.push(row)
  }
  return rows
}

function mergeByPath(branchFiles: ChangedFileRow[], working: ChangedFileRow[]): ChangedFileRow[] {
  const map = new Map<string, ChangedFileRow>()
  for (const file of branchFiles) map.set(file.path, file)
  for (const file of working) map.set(file.path, file)
  return [...map.values()]
}
