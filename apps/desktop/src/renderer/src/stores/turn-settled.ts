/**
 * leo r3 M2：哪些事件说明这一轮已经站住（不会再被出字前回滚撕掉）：模型出字 / 工具 / 审批，或 run.end。
 */
import { eventMarksProducedOutput } from "@enjoy-agents/ipc-contract/pre-output-failure"
import { emitTurnProducedOutput } from "./pre-output-rollback-listeners"
import { forgetSentUserTurn } from "./sent-user-turns"

export function turnSettledByEvent(event: { type: string }): boolean {
  if (event.type === "run.end") return true
  // source.added 只在泵已开才算；这里拿不到泵状态，保守不算（开泵前 cite 不算出字）。
  return eventMarksProducedOutput(event, false)
}

/**
 * 这一轮站住就通知（首句自动标题落定）。前台走 chat-store，后台停车分支走 dispatchAgentEvent。
 * nonAgentRun：标题精炼等 completion 跑在同一会话上，它的出字 / run.end 不是这一轮站住，不算。
 */
export function noteTurnSettled(
  sessionId: string | undefined | null,
  event: { type: string },
  nonAgentRun = false
): boolean {
  if (nonAgentRun || !sessionId || !turnSettledByEvent(event)) return false
  emitTurnProducedOutput(sessionId)
  // 站住了就不会再被撕：忘掉发出时记的那一句。
  forgetSentUserTurn(sessionId)
  return true
}
