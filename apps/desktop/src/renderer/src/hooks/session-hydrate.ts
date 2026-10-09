/**
 * 把库行折进前台 store。世代计数在 session-hydrate-generation.ts，避免测试加载合约入口。
 */
import { migrateContentToParts, safeValidateUIMessages } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "../stores/chat-store"
import { threadFromRows, type SessionMessageRow } from "./hydrate-thread"
import { finishSessionHydrate } from "./session-hydrate-finish"

export function applySessionHydrate(input: {
  dbRows: SessionMessageRow[]
  sameSession: boolean
  generation: number
  sessionId: string
}): boolean {
  const latest = useChatStore.getState()
  const next = finishSessionHydrate({
    generation: input.generation,
    sessionId: input.sessionId,
    currentSessionId: latest.sessionId,
    dbMessages: threadFromRows(input.dbRows),
    liveMessages: latest.messages,
    sameSession: input.sameSession,
    running: latest.running
  })
  if (next === undefined) return false
  restoreUiMessages(input.dbRows)
  latest.setMessages(next)
  return true
}

function restoreUiMessages(rows: SessionMessageRow[]) {
  safeValidateUIMessages(
    rows.map((row) => ({
      id: row.id,
      role: row.role,
      parts: row.parts && row.parts.length > 0 ? row.parts : migrateContentToParts(row.content),
      createdAt: row.createdAt
    }))
  )
}
