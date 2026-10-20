/**
 * Composer 运行控制：Stop、认领 runId。切会话只停车，不 abort。
 * agent.run 返回前 runId 为空，Stop 也必须先松 UI，不能空 return。
 */
import { sealAbandonedTools } from "@enjoy-agents/ipc-contract"
import { USER_ABORTED_CODE } from "@enjoy-agents/ipc-contract/desktop-notify"
import { getIde, hasIde } from "../lib/ide"
import { useAttentionStore } from "../stores/attention/attention-store"
import { useChatStore } from "../stores/chat-store"
import { rememberStoppedRun } from "../stores/stopped-runs"
import { canClaimComposerRun, isEmptyStreamingAssistant } from "./composer-run-policy"
import { pauseFollowups } from "./followup-queue"
import { followupSendInFlight } from "./followup-autostart"
import { hasQueuedComposerSend } from "./queue-composer-send"

/** IPC 返回后认领本轮；切走则写入停车快照，只有用户 Stop 才当孤儿 abort。 */
export function claimComposerRun(startedSessionId: string | null, runId: string): boolean {
  const store = useChatStore.getState()
  if (canClaimComposerRun({
    running: store.running,
    sessionId: store.sessionId,
    startedSessionId
  })) {
    store.setRunning(true, runId)
    if (startedSessionId) useAttentionStore.getState().rememberRun(runId, startedSessionId)
    return true
  }
  if (startedSessionId && useAttentionStore.getState().claimParkedRun(startedSessionId, runId)) {
    return true
  }
  return false
}

/** 主进程已经开工但 UI 已停 / 已切会话时，把那一轮 abort 掉。 */
export function abortOrphanedRun(runId: string) {
  if (!hasIde()) return
  void getIde().ai.abort(runId).catch(() => undefined)
}

/**
 * 立刻停 UI。不要等 abort IPC，也不要求已经有 runId。
 * 空的 pending 助手直接丢掉，避免留下「Thinking / No reasoning trace」。
 */
export async function abortComposerRun(opts?: {
  /** 为什么停：默认用户点停止；切换助手（handoff）传 engineSwitched，排队说明行换成「你换了助手…」。 */
  pauseReason?: "stopped" | "engineSwitched"
}) {
  const store = useChatStore.getState()
  const runId = store.runId
  const sessionId = store.sessionId
  // E1：用户停止——排队的先不发（在放 running 之前停住，自启看不到空档）。
  // 换助手时这一轮没在跑：队列若停着（出错 / 额度）保留原因，不改成「你换了助手」。
  // luna #163 P2⑤：「刚开始发、还没出字」也算在跑（见 composerRunInFlight），否则随后那一发作废报的「出错」
  // 把说明行改成琥珀色，用户手动发一条跑完后排队的就自己发给新助手了。
  const reason = opts?.pauseReason ?? "stopped"
  if (reason === "stopped" || composerRunInFlight(store)) pauseFollowups(sessionId, reason)
  // #160 巡检 6：先记下被停的 run，abort 到达 main 之前它迟到的审批 / 出字一律丢掉，审批卡不再冒回来。
  rememberStoppedRun(sessionId, runId)
  dropEmptyPendingAssistant()
  finalizeStreamingAssistant({ aborted: true })
  store.setPendingApproval(null)
  store.setRunning(false)
  store.setError(null)
  store.setNotice(USER_ABORTED_CODE)
  if (sessionId) {
    useAttentionStore.getState().resolveSessionDecisions(sessionId, runId ?? undefined)
  }
  if (runId) abortOrphanedRun(runId)
}

/**
 * 这一轮在跑，或正处在起跑窗口（runId 还没认领、还没出字）：
 * - store.running / runId；
 * - 自启取出的那一条 send 还没返回（followupSendInFlight）；
 * - 建会话窗里排着一发（hasQueuedComposerSend）；
 * - 末尾挂着还没字的乐观助手轮（发出后、首字前；出字前失败会先把它摘掉）；
 * - 本会话的「正在准备…」。
 * 起跑窗口里 running 可能已被上一轮迟到的收尾事件放下，单看 store.running 会漏（luna #163 g163-e733-4）。
 */
export function composerRunInFlight(store: ReturnType<typeof useChatStore.getState>): boolean {
  if (store.running || store.runId) return true
  if (followupSendInFlight() || hasQueuedComposerSend()) return true
  if (isEmptyStreamingAssistant(store.messages.at(-1))) return true
  return Boolean(store.preparingHint && store.preparingSessionId === store.sessionId)
}

/** 启动失败时丢掉还没字的乐观助手轮。 */
export function dropEmptyPendingAssistant() {
  const store = useChatStore.getState()
  if (!isEmptyStreamingAssistant(store.messages.at(-1))) return
  store.setMessages(store.messages.slice(0, -1))
}

function finalizeStreamingAssistant(opts?: { aborted?: boolean }) {
  const store = useChatStore.getState()
  const last = store.messages.at(-1)
  if (last?.role !== "assistant") return
  store.setMessages(
    store.messages.map((message) =>
      message.role === "assistant"
        ? {
            ...message,
            streaming: false,
            tools: sealAbandonedTools(message.tools, { aborted: opts?.aborted })
          }
        : message
    )
  )
}
