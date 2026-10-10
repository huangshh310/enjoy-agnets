/**
 * 回挂 ActiveRun 时带回原助手行，避免再 INSERT 第二条。
 */
import { parseAssistantPayload, type ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"

export type RestoredAssistantSnapshot = {
  assistantMessageId?: string
  tools: ThreadToolCall[]
  assistantPersisted: boolean
}

export function readLatestAssistantSnapshot(sessionId: string): RestoredAssistantSnapshot {
  const row = getDatabase()
    .prepare(
      "SELECT id, content FROM messages WHERE session_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1"
    )
    .get(sessionId) as { id: string; content: string } | undefined
  if (!row) return { tools: [], assistantPersisted: false }
  const payload = parseAssistantPayload(row.content)
  return {
    assistantMessageId: row.id,
    tools: payload.tools ?? [],
    assistantPersisted: true
  }
}
