/**
 * 把库行折进前台 store。世代计数在 session-hydrate-generation.ts，避免测试加载合约入口。
 */
import { migrateContentToParts, safeValidateUIMessages } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "../stores/chat-store"
import { takeHeldApprovalResolved } from "../stores/held-approval-resolved"
import { useAttentionStore } from "../stores/attention/attention-store"
import { threadFromRows, type SessionMessageRow } from "./hydrate-thread"
import { hydrateSessionRunning } from "./hydrate-session-running"
import { markRunningTail } from "./mark-running-tail"
import { applyFinishedHydrate } from "./session-hydrate-finish"
import { noticeAfterRestartHydrate } from "./hydrate-restart-notice"
import { shouldClearErrorOnSwitch } from "./session-switch-error"
import { markSessionHistoryHydrated } from "./session-history-pending"

export function applySessionHydrate(input: {
  dbRows: SessionMessageRow[]
  sameSession: boolean
  generation: number
  sessionId: string
  sessionRunning?: boolean
}): boolean {
  const latest = useChatStore.getState()
  const sessionOwnRunning =
    input.sessionRunning === true ||
    useAttentionStore.getState().parks[input.sessionId]?.running === true
  const running = hydrateSessionRunning({ sessionOwnRunning })
  const ok = applyFinishedHydrate(
    {
      generation: input.generation,
      sessionId: input.sessionId,
      currentSessionId: latest.sessionId,
      // 还在跑：最后一条用户话之后的助手话标成 streaming（思考行现在时、不提前出结束态按钮）。
      dbMessages: markRunningTail(threadFromRows(input.dbRows, { sealAbandoned: !running }), running),
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
  markSessionHistoryHydrated(input.sessionId)
  const store = useChatStore.getState()
  const notice = noticeAfterRestartHydrate({
    sessionId: input.sessionId,
    sameSession: input.sameSession,
    running,
    notice: store.notice,
    messages: store.messages
  })
  if (notice && notice !== store.notice) store.setNotice(notice)
  // 红卡只由 #150 的 runs 表 lastError 决定（loadSession 紧接着 restoreSessionErrorFromDb）。
  // 这里只做一件事：换到别的会话且不在跑时，清掉上一会话的红卡，不让 A 的错挂到 B 上（leo #151）。
  if (shouldClearErrorOnSwitch({ sameSession: input.sameSession, running }) && store.error) store.setError(null)
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
