/**
 * 改动条对应的审查作用域：有上一轮写盘走 last-turn。
 * CLI 抽不出 path 时不要锁死空的「上一轮」，回落未提交。
 */
import type { ReviewScope } from "../../right-pane/views/review/types/review.types"

export function reviewScopeForLastTurnCount(count: number): ReviewScope {
  return reviewScopeForSession({ lastTurnCount: count, dirtyCount: 0 })
}

export function reviewScopeForSession(input: {
  lastTurnCount: number
  dirtyCount: number
}): ReviewScope {
  if (input.lastTurnCount > 0) return "last-turn"
  return "uncommitted"
}
