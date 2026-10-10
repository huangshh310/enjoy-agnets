/**
 * Composer 运行控制：Stop、认领 runId。切会话只停车，不 abort。
 * agent.run 返回前 runId 为空，Stop 也必须先松 UI，不能空 return。
 */
import { sealAbandonedTools } from "@enjoy-agents/ipc-contract"
import { USER_ABORTED_CODE } from "@enjoy-agents/ipc-contract/desktop-notify"
import { getIde, hasIde } from "../lib/ide"
import { useAttentionStore } from "../stores/attention/attention-store"
import { useChatStore } from "../stores/chat-store"
import { canClaimComposerRun, isEmptyStreamingAssistant } from "./composer-run-policy"

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
export async function abortComposerRun() {
  const store = useChatStore.getState()
  const runId = store.runId
  const sessionId = store.sessionId
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

/** 启动失败时丢掉还没字的乐观助手轮。 */
export function dropEmptyPendingAssistant() {
  const store = useChatStore.getState()
  if (!isEmptyStreamingAssistant(store.messages.at(-1))) return
  store.setMessages(store.messages.slice(0, -1))
}

/** 出字前失败：丢掉乐观用户句 + 空助手。Stop 仍只丢空助手。 */
export function dropOptimisticTurn(sentContent?: string) {
  const store = useChatStore.getState()
  let messages = store.messages
  if (isEmptyStreamingAssistant(messages.at(-1))) {
    messages = messages.slice(0, -1)
  }
  const last = messages.at(-1)
  if (last?.role === "user" && (!sentContent || last.content === sentContent)) {
    messages = messages.slice(0, -1)
  }
  if (messages !== store.messages) store.setMessages(messages)
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
