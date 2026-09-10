/**
 * 审批停车时把 model messages 写进 checkpoint，重启后续 HMAC 等待。
 */
import { snapshotGeneration } from "@enjoy-agents/agent-core"
import { updateRun } from "@enjoy-agents/db"
import type { PendingApproval } from "./consume-stream"
import { getDatabase } from "./database"
import { requestFromAgentInput } from "./persist-run"
import type { ActiveRun } from "./agent-run-state"
import { parseAgentCheckpointExtras } from "./running-orphan-plan"

export type WaitingCheckpoint = {
  version: 1
  request: ReturnType<typeof requestFromAgentInput>
  modelMessages: unknown
  pendingApprovals: PendingApproval[]
  runtimeId?: string
}

export function persistWaitingRun(run: ActiveRun, runId: string): void {
  const request = requestFromAgentInput(run.input)
  const body: WaitingCheckpoint = {
    version: 1,
    request,
    modelMessages: run.messages,
    pendingApprovals: run.pendingApprovals,
    runtimeId: run.input.runtimeId
  }
  updateRun(getDatabase(), runId, {
    status: "waiting_review",
    checkpoint: JSON.stringify({
      ...JSON.parse(snapshotGeneration(request)),
      modelMessages: body.modelMessages,
      pendingApprovals: body.pendingApprovals,
      runtimeId: body.runtimeId
    })
  })
}

export function parseWaitingExtras(raw: string | null): {
  modelMessages?: unknown
  pendingApprovals?: PendingApproval[]
  runtimeId?: string
  resumeAt?: string
} {
  const extras = parseAgentCheckpointExtras(raw)
  return {
    modelMessages: extras.modelMessages,
    pendingApprovals: extras.pendingApprovals as PendingApproval[] | undefined,
    runtimeId: extras.runtimeId,
    resumeAt: extras.resumeAt
  }
}
