/**
 * 开跑标执行中。宣称收工的 run.end 进待验收，只有人点通过才能 done。
 * 本轮工具全是拒绝 / 未执行：回待办，不进待验收。
 * run.error / 取消回 in_progress，走 Inbox 失败筛。≠ waiting_review 工具闸。
 */
import type { SessionWorkflowStatus, StreamEvent } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { lastTurnDeniedOnly } from "../right-pane/views/review/last-turn-paths"
import { applyLocalSessionWorkflow } from "./patch-session-workflow"
import { workflowAfterStreamEvent } from "./review-gate-phase"
import { turnFromEvent } from "./turn-from-event"

export function syncReviewGateAfterEvent(
  event: StreamEvent,
  sessionId: string | undefined,
  foreground: boolean
): void {
  if (!sessionId) return
  // main 已经接手（有流事件）：发送前快照作废，不再回滚。
  composerStartGates.delete(sessionId)
  const chat = useChatStore.getState()
  const turn = turnFromEvent(event)
  const deniedOnly =
    !turn && foreground && event.type === "run.end" && lastTurnDeniedOnly(chat.messages)
  const next = workflowAfterStreamEvent(event.type, { deniedOnly, turn })
  if (!next) return
  applyLocalSessionWorkflow(sessionId, next)
}

type GateSnapshot = { before: SessionWorkflowStatus | null; applied: SessionWorkflowStatus | null }
const composerStartGates = new Map<string, GateSnapshot>()

function localWorkflow(sessionId: string): SessionWorkflowStatus | null {
  return useChatStore.getState().repositories.find((node) => node.id === sessionId)?.workflowStatus ?? null
}

export function syncReviewGateOnComposerStart(sessionId: string | null): void {
  if (!sessionId) return
  const before = localWorkflow(sessionId)
  applyLocalSessionWorkflow(sessionId, "in_progress")
  const applied = localWorkflow(sessionId)
  if (applied !== before) composerStartGates.set(sessionId, { before, applied })
}

/** main 已接手这次发送（拿到 runId）：快照作废。 */
export function commitComposerStartGate(sessionId: string | null | undefined): void {
  if (sessionId) composerStartGates.delete(sessionId)
}

/**
 * jojo P2：发送在 main 接手前失败（看门狗 / 闸拦 / 抛错）：把发送前乐观改的 workflow 还原。
 * 只在之后没有更新的改动（当前值仍是当时改成的值）时还原。
 */
export function rollbackComposerStartGate(sessionId: string | null | undefined): void {
  if (!sessionId) return
  const snap = composerStartGates.get(sessionId)
  if (!snap) return
  composerStartGates.delete(sessionId)
  if (localWorkflow(sessionId) !== snap.applied) return
  useChatStore.getState().patchSessionNode(sessionId, { workflowStatus: snap.before })
}

export function resetComposerStartGatesForTest(): void {
  composerStartGates.clear()
}
