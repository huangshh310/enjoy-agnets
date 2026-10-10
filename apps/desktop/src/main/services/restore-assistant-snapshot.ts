/**
 * 回挂 ActiveRun 时带回本轮助手行，避免再 INSERT 第二条。
 * 只认比本轮最新用户句新（或 created_at ≥ runs.created_at）的助手，禁止盖掉上一轮。
 */
import { parseAssistantPayload, type ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { isTerminalRestartAssistant } from "./assistant-row-ownership"

export type RestoredAssistantSnapshot = {
  assistantMessageId?: string
  tools: ThreadToolCall[]
  assistantPersisted: boolean
}

export function assistantBelongsToRun(
  assistantCreatedAt: number,
  latestUserCreatedAt?: number,
  runCreatedAt?: number
): boolean {
  if (latestUserCreatedAt != null && assistantCreatedAt > latestUserCreatedAt) return true
  if (runCreatedAt != null && assistantCreatedAt >= runCreatedAt) return true
  return false
}

export function readLatestAssistantSnapshot(
  sessionId: string,
  opts?: { runCreatedAt?: number }
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
  if (!assistantBelongsToRun(row.createdAt, latestUser?.createdAt, opts?.runCreatedAt)) {
    return { tools: [], assistantPersisted: false }
  }
  if (isTerminalRestartAssistant(row.content)) {
    return { tools: [], assistantPersisted: false }
  }
  const payload = parseAssistantPayload(row.content)
  return {
    assistantMessageId: row.id,
    tools: payload.tools ?? [],
    assistantPersisted: true
  }
}
