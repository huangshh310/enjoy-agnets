/**
 * 发送失败：还文、可读 notice、清转圈停车；空新会话不留在侧栏。
 */
import { restoreDraftIntoSession } from "@renderer/lib/session-draft-storage"
import { rollbackComposerStartGate } from "../../components/ai-chat/review-gate/sync-review-gate"
import { useAttentionStore } from "../../stores/attention/attention-store"
import { useChatStore } from "../../stores/chat-store"
import { messageHasBody } from "./composer-can-send"
import { emitPreOutputRolledBack } from "../../stores/pre-output-rollback-listeners"
import { discardCreatedSession } from "../discard-created-session"
import { pauseFollowups } from "../followup-queue"
import { followupPauseReasonForFailure } from "../followup-pause"
import { dropEmptyPendingAssistant } from "../composer-run-control"
import {
  mergeComposerText,
  restoreComposerAfterFailedSend,
  restoreComposerDraft,
  type QueuedComposerAsset
} from "../queue-composer-send"
import { restoreComposerSendChips, type ComposerSendSnapshot } from "./composer-send-snapshot"

export function failComposerSend(input: {
  text: string
  reason: string
  sessionId: string | null
  /** 只有这次发送新建的会话才能删；已有会话失败不删。 */
  createdSessionId?: string | null
  assets?: QueuedComposerAsset[]
  dropOptimisticUser?: boolean
  /** 乐观气泡里的正文（拼了引用 / 前缀）；不给就按 text 找。 */
  optimisticContent?: string
  /** 发送前拍的引用 / 技能 / 知识 Chip，一并还回输入框。 */
  chips?: ComposerSendSnapshot
  /** running 属于别的在跑轮次（排队首发等不到空闲）：不动 running、不清 pending 助手与停车。 */
  keepRunning?: boolean
}): void {
  // E1：这一发没发出去，排队的先停住（失败那句回到输入框，不能让排在后面的抢先发出去）。
  pauseFollowups(input.sessionId, followupPauseReasonForFailure(input.reason))
  // jojo P2：main 没接手，发送前乐观标的「执行中」还原（已通过的会话不留蓝圈、不重现改动条）。
  rollbackComposerStartGate(input.sessionId)
  // jojo r5 P1：用户已切到别的会话——稿还回发出的那个会话的草稿；当前输入框 / running / 红卡 / 线程都不动。
  const current = useChatStore.getState().sessionId
  if (input.sessionId && current !== input.sessionId) {
    restoreDraftIntoSession(input.sessionId, input.text, input.assets ?? [])
    // leo r6 BLOCK：离开时这一发被停车成「在跑」；没开跑就失败了，停车档也要收掉，否则切回去永远转圈、Enter 只排队。
    // keepRunning = 那个会话里还有别的轮真在跑：停车档是它的，不动。
    // 同会话分支一样 takePark：切回去不转圈、字和图在输入框里（换会话本来就清红卡，原因条不跟着停车）。
    if (!input.keepRunning) useAttentionStore.getState().takePark(input.sessionId)
    return
  }
  if (input.keepRunning) {
    restoreComposerDraft(input.text, input.assets)
    useChatStore.getState().setError(input.reason)
  } else {
    dropEmptyPendingAssistant()
    if (input.dropOptimisticUser) dropMatchingOptimisticUser(input.optimisticContent ?? input.text)
    if (input.sessionId) useAttentionStore.getState().takePark(input.sessionId)
    // 先还文 + notice，再删空会话。禁止等 session.delete 才出提示（会空几秒）。
    restoreComposerAfterFailedSend(input.text, input.reason, input.assets, input.sessionId)
  }
  if (input.chips) restoreComposerSendChips(input.chips)
  // leo S1：keepRunning = 会话里还有别的轮在跑（pending 助手 / 停车都保留），绝不能删会话。
  if (
    !input.keepRunning &&
    input.createdSessionId &&
    input.createdSessionId === input.sessionId &&
    isEmptyFailedSession(input.createdSessionId)
  ) {
    void discardCreatedSession(input.createdSessionId, () => true, {
      keepComposer: true,
      onlyIfEmpty: true
    })
  }
}

function dropMatchingOptimisticUser(content: string): void {
  const store = useChatStore.getState()
  const last = [...store.messages].reverse().find((message) => message.role === "user")
  if (!last || last.content !== content) return
  const next = store.messages.filter((message) => message.id !== last.id)
  store.setMessages(next)
  // jojo P2（#136 gate2）：乐观首句撤掉了，按它起的自动标题也复原。
  if (store.sessionId) {
    emitPreOutputRolledBack({
      sessionId: store.sessionId,
      userTurnsLeft: next.filter((message) => message.role === "user").length
    })
  }
}

function isEmptyFailedSession(sessionId: string | null): boolean {
  if (!sessionId) return false
  const store = useChatStore.getState()
  if (store.sessionId !== sessionId) return false
  return !store.messages.some(
    (message) =>
      (message.role === "user" || message.role === "assistant") && messageHasBody(message)
  )
}

export function mergeFailedComposerText(restored: string, current: string): string {
  return mergeComposerText(restored, current)
}
