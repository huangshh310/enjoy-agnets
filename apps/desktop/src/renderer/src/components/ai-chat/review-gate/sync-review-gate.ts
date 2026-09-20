/**
 * 开跑标执行中。宣称收工的 run.end 进待验收，只有人点通过才能 done。
 * run.error / 取消回 in_progress，走 Inbox 失败筛。≠ waiting_review 工具闸。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { patchSessionWorkflow } from "./patch-session-workflow"
import { workflowAfterStreamEvent } from "./review-gate-phase"

export function syncReviewGateAfterEvent(
  event: StreamEvent,
  sessionId: string | undefined,
  _foreground: boolean
): void {
  if (!sessionId) return
  const next = workflowAfterStreamEvent(event.type)
  if (!next) return
  void patchSessionWorkflow(sessionId, next)
}

export function syncReviewGateOnComposerStart(sessionId: string | null): void {
  if (!sessionId) return
  void patchSessionWorkflow(sessionId, "in_progress")
}
