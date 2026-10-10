/**
 * 发送失败：还文、可读 notice、清转圈停车；空新会话不留在侧栏。
 */
import { useAttentionStore } from "../../stores/attention/attention-store"
import { useChatStore } from "../../stores/chat-store"
import { discardCreatedSession } from "../discard-created-session"
import { dropEmptyPendingAssistant } from "../composer-run-control"
import { type QueuedComposerAsset } from "../composer-assets"
import { mergeComposerText, restoreComposerAfterFailedSend } from "../queue-composer-send"

export function failComposerSend(input: {
  text: string
  reason: string
  sessionId: string | null
  assets?: QueuedComposerAsset[]
  dropOptimisticUser?: boolean
}): void {
  dropEmptyPendingAssistant()
  if (input.dropOptimisticUser) dropMatchingOptimisticUser(input.text)
  if (input.sessionId) useAttentionStore.getState().takePark(input.sessionId)
  // 先还文 + notice，再删空会话。禁止等 session.delete 才出提示（会空几秒）。
  restoreComposerAfterFailedSend(input.text, input.reason, input.assets)
  if (input.sessionId && isEmptyFailedSession(input.sessionId)) {
    void discardCreatedSession(input.sessionId, () => true, { keepComposer: true })
  }
}

function dropMatchingOptimisticUser(content: string): void {
  const store = useChatStore.getState()
  const last = [...store.messages].reverse().find((message) => message.role === "user")
  if (!last || last.content !== content) return
  store.setMessages(store.messages.filter((message) => message.id !== last.id))
}

function isEmptyFailedSession(sessionId: string | null): boolean {
  if (!sessionId) return false
  const store = useChatStore.getState()
  if (store.sessionId !== sessionId) return false
  return !store.messages.some(
    (message) =>
      (message.role === "user" && message.content.trim()) ||
      (message.role === "assistant" && message.content.trim())
  )
}

export function mergeFailedComposerText(restored: string, current: string): string {
  return mergeComposerText(restored, current)
}
