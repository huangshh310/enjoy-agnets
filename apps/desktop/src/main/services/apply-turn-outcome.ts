/**
 * 跑完时 main 算一次收工判定：写会话 workflow，并挂到 run.end / run.error。
 */
import type { TurnOutcome } from "@enjoy-agents/ipc-contract"
import { decideTurnOutcome } from "@enjoy-agents/ipc-contract/turn-outcome"
import type { ActiveRun } from "./agent-run-state"
import { patchSession } from "./session-queries"

export function turnOutcomeForRun(
  run: Pick<ActiveRun, "tools">,
  ended: "end" | "error" | "abort"
): TurnOutcome {
  return decideTurnOutcome({ ended, tools: run.tools })
}

/** 后台会话也靠库里的 workflow，不依赖前台 renderer 再算一遍。 */
export function persistTurnWorkflow(sessionId: string | undefined, turn: TurnOutcome): void {
  persistSessionWorkflow(sessionId, turn.workflow)
}

export function persistSessionWorkflow(
  sessionId: string | undefined,
  workflow: TurnOutcome["workflow"]
): void {
  if (!sessionId) return
  void patchSession({ id: sessionId, workflowStatus: workflow }).catch(() => undefined)
}
