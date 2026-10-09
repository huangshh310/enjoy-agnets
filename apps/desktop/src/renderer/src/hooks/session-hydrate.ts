/**
 * 把库行折进前台 store。世代计数在 session-hydrate-generation.ts，避免测试加载合约入口。
 */
import { migrateContentToParts, safeValidateUIMessages } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "../stores/chat-store"
import { threadFromRows, type SessionMessageRow } from "./hydrate-thread"
import { pickHydratedMessages } from "./pick-hydrated-messages"

export function applySessionHydrate(input: {
  dbRows: SessionMessageRow[]
  sameSession: boolean
}): void {
  const latest = useChatStore.getState()
  restoreUiMessages(input.dbRows)
  latest.setMessages(
    pickHydratedMessages({
      dbMessages: threadFromRows(input.dbRows),
      liveMessages: latest.messages,
      sameSession: input.sameSession,
      running: latest.running
    })
  )
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
