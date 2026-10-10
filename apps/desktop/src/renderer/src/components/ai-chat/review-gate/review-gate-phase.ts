/**
 * 顶栏三段：执行中 | 待验收 | 完成。运行中盖过其它；空闲不画铬。
 */
import type { TurnOutcome } from "@enjoy-agents/ipc-contract"
import type { ReviewGatePhase, ReviewGatePhaseInput } from "./review-gate.types"

export function reviewGatePhase(input: ReviewGatePhaseInput): ReviewGatePhase | null {
  if (input.running) return "running"
  if (input.workflowStatus === "needs_review") return "needs_review"
  if (input.workflowStatus === "done") return "done"
  return null
}

/** 一轮宣称收工才可能进待验收。run.error / 开跑不进这扇门。 */
export function claimDoneForcesReview(eventType: string): boolean {
  return eventType === "run.end"
}

/** 流事件 → 会话工单态。有 turn 时只信 main；失败/取消回执行中。 */
export function workflowAfterStreamEvent(
  eventType: string,
  opts?: { deniedOnly?: boolean; turn?: TurnOutcome }
): "in_progress" | "needs_review" | "todo" | null {
  if (opts?.turn) return opts.turn.workflow
  if (eventType === "run.start" || eventType === "run.error") return "in_progress"
  if (eventType === "run.end") return opts?.deniedOnly ? "todo" : "needs_review"
  return null
}
