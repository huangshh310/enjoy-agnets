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
  /** main 在 loadSession 开头说这个会话在跑（不含停车档）。不给就按 sessionRunning。 */
  mainRunning?: boolean
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
      dbMessages: markRunningTail(
        threadFromRows(input.dbRows, { sealAbandoned: !running }),
        tailStillRunning(input.sessionId, input.mainRunning ?? input.sessionRunning === true)
      ),
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

/**
 * 标「进行中」只在两边都说在跑时才做（leo #164 BLOCK ⑤）：
 * - main 在 loadSession 开头说在跑（main 说空闲就信它：一轮已知结束后停车档残留的 running 不算，P3）；
 * - 且**此刻**还在跑：停车档 running，或前台已是这个会话且 store.running。loadSession 在 await session.messages
 *   期间 run.end 落地会把它们清掉（P2）；后台会话收到 run.end / run.error 时停车档也已收掉（P1）。
 * 否则不标：宁可显示已结束，也不留一条永远不会收掉的「进行中」。
 */
function tailStillRunning(sessionId: string, mainRunning: boolean): boolean {
  if (!mainRunning) return false
  if (useAttentionStore.getState().parks[sessionId]?.running === true) return true
  const live = useChatStore.getState()
  return live.sessionId === sessionId && live.running === true
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
