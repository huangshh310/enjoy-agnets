/**
 * 回挂 ActiveRun 时带回本轮助手行，避免再 INSERT 第二条。
 * 信封有 runId 只认本轮；没有则 createdAt 必须同时晚于本轮用户句且 ≥ runs.created_at。
 */
import { parseAssistantPayload, type ThreadToolCall } from "@enjoy-agents/ipc-contract/assistant-payload"
import { getDatabase } from "./database"
import { isTerminalRestartAssistant } from "./assistant-row-ownership"

export type RestoredAssistantSnapshot = {
  assistantMessageId?: string
  tools: ThreadToolCall[]
  assistantPersisted: boolean
}

export type AssistantRunIdentity = {
  runId?: string
  envelopeRunId?: string
}

export function assistantBelongsToRun(
  assistantCreatedAt: number,
  latestUserCreatedAt?: number,
  runCreatedAt?: number,
  identity?: AssistantRunIdentity
): boolean {
  if (identity?.runId && identity.envelopeRunId) {
    return identity.envelopeRunId === identity.runId
  }
  const afterUser = latestUserCreatedAt == null || assistantCreatedAt > latestUserCreatedAt
  const afterRun = runCreatedAt == null || assistantCreatedAt >= runCreatedAt
  return afterUser && afterRun
}

export function readLatestAssistantSnapshot(
  sessionId: string,
  opts?: { runCreatedAt?: number; runId?: string }
): RestoredAssistantSnapshot {
  const db = getDatabase()
  const latestUser = db
    .prepare(
      "SELECT created_at as createdAt FROM messages WHERE session_id = ? AND role = 'user' ORDER BY created_at DESC LIMIT 1"
    )
    .get(sessionId) as { createdAt: number } | undefined
  const row = db
    .prepare(
      "SELECT id, content, created_at as createdAt FROM messages WHERE session_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1"
    )
    .get(sessionId) as { id: string; content: string; createdAt: number } | undefined
  if (!row) return { tools: [], assistantPersisted: false }
  const payload = parseAssistantPayload(row.content)
  if (
    !assistantBelongsToRun(row.createdAt, latestUser?.createdAt, opts?.runCreatedAt, {
      runId: opts?.runId,
      envelopeRunId: payload.runId
    })
  ) {
    return { tools: [], assistantPersisted: false }
  }
  if (isTerminalRestartAssistant(row.content)) {
    return { tools: [], assistantPersisted: false }
  }
  return {
    assistantMessageId: row.id,
    tools: payload.tools ?? [],
    assistantPersisted: true
  }
}
