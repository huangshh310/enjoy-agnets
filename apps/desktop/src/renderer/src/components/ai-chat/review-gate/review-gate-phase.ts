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

/** 一轮宣称收工必须进待验收。run.error 走失败筛，不进这扇门。 */
export function claimDoneForcesReview(eventType: string): boolean {
  return eventType === "run.end"
}
