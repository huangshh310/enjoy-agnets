/**
 * 已决且 SDK 响应已落库：只续泵，禁止再执行工具。
 */
import { getActiveRun } from "./agent-run-state"

export function markResumeAndPump(runId: string): boolean {
  const run = getActiveRun(runId)
  if (!run) return false
  run.resumeAfterPump = true
  void import("./agent-pump")
    .then(({ pumpStream }) => pumpStream(runId))
    .catch((error) => {
      console.error("[restore] resumeAfterPump failed", { runId, error })
    })
  return true
}
