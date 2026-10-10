/**
 * 把库行折进前台 store。世代计数在 session-hydrate-generation.ts，避免测试加载合约入口。
 */
import { migrateContentToParts, safeValidateUIMessages } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "../stores/chat-store"
import { takeHeldApprovalResolved } from "../stores/held-approval-resolved"
import { useAttentionStore } from "../stores/attention/attention-store"
import { threadFromRows, type SessionMessageRow } from "./hydrate-thread"
import { hydrateSessionRunning } from "./hydrate-session-running"
import { applyFinishedHydrate } from "./session-hydrate-finish"

export function applySessionHydrate(input: {
  dbRows: SessionMessageRow[]
  sameSession: boolean
  generation: number
  sessionId: string
  sessionRunning?: boolean
}): boolean {
  const latest = useChatStore.getState()
  const parkedRunning =
    input.sessionRunning === true ||
    useAttentionStore.getState().parks[input.sessionId]?.running === true
  const running = hydrateSessionRunning({
    sessionId: input.sessionId,
    storeSessionId: latest.sessionId,
    storeRunning: latest.running,
    parkedRunning
  })
  const ok = applyFinishedHydrate(
    {
      generation: input.generation,
      sessionId: input.sessionId,
      currentSessionId: latest.sessionId,
      dbMessages: threadFromRows(input.dbRows, { sealAbandoned: !running }),
      liveMessages: latest.messages,
      sameSession: input.sameSession,
      running
    },
    (next) => {
      restoreUiMessages(input.dbRows)
      latest.setMessages(next)
    }
  )
  if (!ok) return false
  const store = useChatStore.getState()
  for (const event of takeHeldApprovalResolved(input.sessionId)) {
    store.applyStreamEvent(event)
  }
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
