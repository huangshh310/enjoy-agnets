/**
 * 顶栏三段：执行中 | 待验收 | 完成。运行中盖过其它；空闲不画铬。
 */
import type { ReviewGatePhase, ReviewGatePhaseInput } from "./review-gate.types"

export function reviewGatePhase(input: ReviewGatePhaseInput): ReviewGatePhase | null {
  if (input.running) return "running"
  if (input.workflowStatus === "needs_review") return "needs_review"
  if (input.workflowStatus === "done") return "done"
  return null
}

/** 本轮有写盘 path 才进人验收；纯问答不假装待验收。 */
export function runNeedsHumanReview(writePaths: readonly string[]): boolean {
  return writePaths.some((path) => path.trim().length > 0)
}
