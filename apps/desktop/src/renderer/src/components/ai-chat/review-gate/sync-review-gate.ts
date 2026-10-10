/**
 * 开跑标执行中。宣称收工的 run.end 进待验收，只有人点通过才能 done。
 * 本轮工具全是拒绝 / 未执行：回待办，不进待验收。
 * run.error / 取消回 in_progress，走 Inbox 失败筛。≠ waiting_review 工具闸。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { lastTurnDeniedOnly } from "../right-pane/views/review/last-turn-paths"
import { patchSessionWorkflow } from "./patch-session-workflow"
import { workflowAfterStreamEvent } from "./review-gate-phase"
import { turnFromEvent } from "./turn-from-event"

export function syncReviewGateAfterEvent(
  event: StreamEvent,
  sessionId: string | undefined,
  _foreground: boolean
): void {
  if (!sessionId) return
  const chat = useChatStore.getState()
  const turn = turnFromEvent(event)
  const deniedOnly = !turn && event.type === "run.end" && lastTurnDeniedOnly(chat.messages)
  const next = workflowAfterStreamEvent(event.type, { deniedOnly, turn })
  if (!next) return
  void patchSessionWorkflow(sessionId, next)
}

export function syncReviewGateOnComposerStart(sessionId: string | null): void {
  if (!sessionId) return
  void patchSessionWorkflow(sessionId, "in_progress")
}
