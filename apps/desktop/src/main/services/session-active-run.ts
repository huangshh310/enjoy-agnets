/**
 * 该会话自己的活泵。回灌只问这个，不看前台 Composer running。
 */
import { listActiveRuns } from "./agent-run-state"

export function sessionActiveRun(sessionId: string): { runId: string | null; running: boolean } {
  const hit = listActiveRuns().find((item) => item.run.input.sessionId === sessionId)
  return { runId: hit?.runId ?? null, running: Boolean(hit) }
}
