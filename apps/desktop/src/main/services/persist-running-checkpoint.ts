/**
 * 一轮 ToolLoop 收束后把 modelMessages 写入 running checkpoint。
 * 中途工具执行没有这份 extras，启动不得续。
 */
import { snapshotGeneration } from "@enjoy-agents/agent-core"
import { updateRun } from "@enjoy-agents/db"
import { getDatabase } from "./database"
import { requestFromAgentInput } from "./persist-run"
import { runningCheckpointFlags, TOOL_BOUNDARY } from "./running-orphan-plan"
import type { ActiveRun } from "./agent-run-state"

export function persistRunningCheckpoint(run: ActiveRun, runId: string): void {
  if (run.pendingApprovals.length > 0) return
  if (!Array.isArray(run.messages) || run.messages.length === 0) return
  const request = requestFromAgentInput(run.input)
  updateRun(getDatabase(), runId, {
    status: "running",
    checkpoint: JSON.stringify({
      ...JSON.parse(snapshotGeneration(request)),
      modelMessages: run.messages,
      runtimeId: run.input.runtimeId,
      resumeAt: TOOL_BOUNDARY,
      ...runningCheckpointFlags(run.input)
    })
  })
}
