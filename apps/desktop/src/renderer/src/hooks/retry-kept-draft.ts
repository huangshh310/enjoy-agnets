/**
 * 首字前失败红卡「重试」：输入框有字 → 走发送；输入框空但用户句还在库里 → 原地重跑那一句（不经输入框另发，防重复）。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { sendComposerMessage } from "@renderer/hooks/send-composer"
import { retryFailedUserTurn } from "@renderer/hooks/regenerate-turn"

export function retryKeptDraft(): void {
  const state = useChatStore.getState()
  if (state.composer.trim()) {
    void sendComposerMessage()
    return
  }
  const lastUser = [...state.messages].reverse().find((item) => item.role === "user")
  if (!lastUser?.content) return
  void retryFailedUserTurn(lastUser)
}
