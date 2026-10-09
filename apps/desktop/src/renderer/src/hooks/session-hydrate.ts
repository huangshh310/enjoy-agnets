/**
 * 会话回灌世代：过期的 loadSession 不得在发送之后把乐观气泡洗成欢迎页。
 */
import { migrateContentToParts, safeValidateUIMessages } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "../stores/chat-store"
import { threadFromRows, type SessionMessageRow } from "./hydrate-thread"
import { pickHydratedMessages } from "./pick-hydrated-messages"

let hydrateGeneration = 0

/** 发送或新开回灌时加一代，让仍在 await 的 loadSession 自动作废。 */
export function bumpSessionHydrateGeneration(): number {
  hydrateGeneration += 1
  return hydrateGeneration
}

export function isSessionHydrateCurrent(generation: number): boolean {
  return generation === hydrateGeneration
}

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
