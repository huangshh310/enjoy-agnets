/**
 * 开跑标执行中。run.end 宣称收工必须进待验收，只有人点通过才能 done。
 * run.error 走失败 Inbox，不进这扇门。≠ waiting_review 工具闸。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { patchSessionWorkflow } from "./patch-session-workflow"
import { claimDoneForcesReview } from "./review-gate-phase"

export function syncReviewGateAfterEvent(
  event: StreamEvent,
  sessionId: string | undefined,
  _foreground: boolean
): void {
  if (!sessionId) return
  if (event.type === "run.start") {
    void patchSessionWorkflow(sessionId, "in_progress")
    return
  }
  if (!claimDoneForcesReview(event.type)) return
  void patchSessionWorkflow(sessionId, "needs_review")
}

export function syncReviewGateOnComposerStart(sessionId: string | null): void {
  if (!sessionId) return
  void patchSessionWorkflow(sessionId, "in_progress")
}
