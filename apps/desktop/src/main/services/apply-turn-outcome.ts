/**
 * 跑完时 main 算一次收工判定：写会话 workflow，并挂到 run.end / run.error。
 * needs_review 粘性：开跑 / 只读收工不得擦掉，只等人通过或打回。
 */
import type { TurnOutcome } from "@enjoy-agents/ipc-contract"
import { decideTurnOutcome } from "@enjoy-agents/ipc-contract/turn-outcome"
import type { ActiveRun } from "./agent-run-state"
import { getDatabase } from "./database"
import { persistSessionReview } from "./session-review-persist.ts"
import { shouldWriteSessionWorkflow, stickyTurnOutcome } from "./session-workflow-sticky"
import { reviewFilesFromTools } from "./turn-changed-files.ts"

export { shouldWriteSessionWorkflow, stickyTurnOutcome }

export function turnOutcomeForRun(
  run: Pick<ActiveRun, "tools" | "input">,
  ended: "end" | "error" | "abort" | "archive"
): TurnOutcome {
  const base = stickyTurnOutcome(
    decideTurnOutcome({ ended, tools: run.tools }),
    readSessionWorkflow(run.input.sessionId)
  )
  if (base.workflow !== "needs_review") return base
  const changedFiles = reviewFilesFromTools(run.tools)
  return {
    ...base,
    ...(changedFiles ? { changedFiles } : {}),
    completedAt: new Date().toISOString()
  }
}

/** 后台会话也靠库里的 workflow，不依赖前台 renderer 再算一遍。 */
export function persistTurnWorkflow(sessionId: string | undefined, turn: TurnOutcome): void {
  persistSessionWorkflow(sessionId, turn.workflow)
  persistSessionReview(sessionId, turn)
}

export function persistSessionWorkflow(
  sessionId: string | undefined,
  workflow: TurnOutcome["workflow"]
): void {
  if (!sessionId) return
  if (!shouldWriteSessionWorkflow(readSessionWorkflow(sessionId), workflow)) return
  try {
    getDatabase()
      .prepare("UPDATE sessions SET workflow_status = ? WHERE id = ?")
      .run(workflow, sessionId)
  } catch (error) {
    console.error("persistSessionWorkflow failed", sessionId, workflow, error)
  }
}

function readSessionWorkflow(sessionId: string): string | null {
  try {
    const row = getDatabase()
      .prepare("SELECT workflow_status as workflowStatus FROM sessions WHERE id = ?")
      .get(sessionId) as { workflowStatus: string | null } | undefined
    return row?.workflowStatus ?? null
  } catch {
    return null
  }
}
