/**
 * 改动条对应的审查作用域：有上一轮写盘走 last-turn，否则走未提交。
 */
import type { ReviewScope } from "../../right-pane/views/review/types/review.types"

export function reviewScopeForLastTurnCount(count: number): ReviewScope {
  return count > 0 ? "last-turn" : "uncommitted"
}
