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

/** 一轮宣称收工必须进待验收。run.error / 开跑不进这扇门。 */
export function claimDoneForcesReview(eventType: string): boolean {
  return eventType === "run.end"
}

/** 流事件 → 会话工单态。失败/取消回执行中，不得长期占待验收。 */
export function workflowAfterStreamEvent(
  eventType: string
): "in_progress" | "needs_review" | null {
  if (eventType === "run.start" || eventType === "run.error") return "in_progress"
  if (eventType === "run.end") return "needs_review"
  return null
}
