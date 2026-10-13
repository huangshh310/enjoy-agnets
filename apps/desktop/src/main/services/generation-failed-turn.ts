/**
 * luna P3：媒体 / 文本生成失败的收工判定，与 agent 泵失败（jojo P2a）同一规则：
 * 没写盘的真失败回「待办」，不留在侧栏「进行中」；needs_review 粘性照旧。
 */
import type { TurnOutcome } from "@enjoy-agents/ipc-contract"
import { decideTurnOutcome } from "@enjoy-agents/ipc-contract/turn-outcome"
import { persistSessionWorkflow, readSessionWorkflow, stickyTurnOutcome } from "./apply-turn-outcome"

export function generationFailedTurn(sessionId: string | undefined): TurnOutcome {
  const computed = decideTurnOutcome({ ended: "error", tools: [] })
  const turn = sessionId ? stickyTurnOutcome(computed, readSessionWorkflow(sessionId)) : computed
  persistSessionWorkflow(sessionId, turn.workflow)
  return turn
}
