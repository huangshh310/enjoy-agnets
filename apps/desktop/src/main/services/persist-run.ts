/**
 * 把可恢复请求写入 runs.checkpoint。不含密钥。
 */
import { snapshotGeneration, type GenerationRequest } from "@enjoy-agents/agent-core"
import { getRun, insertRun, updateRun } from "@enjoy-agents/db"
import type { RunAgentInput } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"

export function requestFromAgentInput(input: RunAgentInput): GenerationRequest {
  return {
    kind: "agent",
    sessionId: input.sessionId,
    workspaceId: input.workspaceId,
    modelId: input.modelId,
    messages: input.messages.map((message) => ({
      role: message.role,
      content: message.content,
      reasoning: message.reasoning
    })),
    attachments: input.attachments ?? []
  }
}

/** 新建或覆盖同一 runId 的 generation 快照。 */
export function rememberGenerationRun(row: {
  runId: string
  request: GenerationRequest
  status?: string
}): void {
  const db = getDatabase()
  const existing = getRun(db, row.runId)
  const checkpoint = snapshotGeneration(row.request)
  if (!existing) {
    insertRun(db, {
      id: row.runId,
      sessionId: row.request.sessionId,
      workspaceId: row.request.workspaceId ?? null,
      kind: row.request.kind,
      status: row.status ?? "running",
      modelId: row.request.modelId,
      providerId: row.request.providerId ?? null,
      checkpoint,
      error: null
    })
    return
  }
  updateRun(db, row.runId, { status: row.status ?? "running", checkpoint, error: null })
}
