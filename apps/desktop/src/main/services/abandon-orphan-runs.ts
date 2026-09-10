/**
 * 启动时收拾不能续的 running 行。waiting_review 留给 restoreWaitingRuns。
 * 带工具边界 modelMessages 的 Enjoy Local running 留给 restoreRunningRuns。
 */
import { isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import { listRuns, updateRun } from "@enjoy-agents/db"
import { getDatabase } from "./database"
import { isE2eStub } from "./e2e-stub"
import { canResumeRunningOrphan, parseAgentCheckpointExtras } from "./running-orphan-plan"

export function abandonOrphanRuns(): void {
  const db = getDatabase()
  const stub = isE2eStub()
  for (const row of listRuns(db, {}).filter((item) => item.status === "running")) {
    if (!stub && canKeepForResume(row)) continue
    updateRun(db, row.id, { status: "cancelled", error: "Abandoned after process restart." })
  }
}

function canKeepForResume(row: Parameters<typeof canResumeRunningOrphan>[0] & { checkpoint: string | null }): boolean {
  if (!canResumeRunningOrphan(row)) return false
  const runtimeId = parseAgentCheckpointExtras(row.checkpoint).runtimeId
  if (runtimeId && isAcpHostRuntime(runtimeId)) return false
  return true
}
