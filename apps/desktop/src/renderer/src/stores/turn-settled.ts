/**
 * leo r3 M2：哪些事件说明这一轮已经站住（不会再被出字前回滚撕掉）：模型出字 / 工具 / 审批，或 run.end。
 */
import { eventMarksProducedOutput } from "@enjoy-agents/ipc-contract/pre-output-failure"
import { emitTurnProducedOutput } from "./pre-output-rollback-listeners"

export function turnSettledByEvent(event: { type: string }): boolean {
  if (event.type === "run.end") return true
  // source.added 只在泵已开才算；这里拿不到泵状态，保守不算（开泵前 cite 不算出字）。
  return eventMarksProducedOutput(event, false)
}

/** 这一轮站住就通知（首句自动标题落定）。前台走 chat-store，后台停车分支走 dispatchAgentEvent。 */
export function noteTurnSettled(sessionId: string | undefined | null, event: { type: string }): boolean {
  if (!sessionId || !turnSettledByEvent(event)) return false
  emitTurnProducedOutput(sessionId)
  return true
}
