/**
 * 开跑标执行中；前台 run.end 且本轮有写盘才进待验收。
 * 后台轮看不到 path：不假装待验收。≠ waiting_review 工具闸。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { pathsFromLastTurn } from "../right-pane/views/review/last-turn-paths"
import { useChatStore } from "@renderer/stores/chat-store"
import { patchSessionWorkflow } from "./patch-session-workflow"
import { runNeedsHumanReview } from "./review-gate-phase"

export function syncReviewGateAfterEvent(
  event: StreamEvent,
  sessionId: string | undefined,
  foreground: boolean
): void {
  if (!sessionId) return
  if (event.type === "run.start") {
    void patchSessionWorkflow(sessionId, "in_progress")
    return
  }
  if (event.type !== "run.end") return
  if (!foreground) return
  const writePaths = pathsFromLastTurn(useChatStore.getState().messages)
  if (runNeedsHumanReview(writePaths)) {
    void patchSessionWorkflow(sessionId, "needs_review")
  }
}

export function syncReviewGateOnComposerStart(sessionId: string | null): void {
  if (!sessionId) return
  void patchSessionWorkflow(sessionId, "in_progress")
}
