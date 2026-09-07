/**
 * 当前任务回 idle、或已 idle 时新入队，自动取出再走 sendComposerMessage。
 */
import { useEffect } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { subscribeFollowups } from "./followup-queue"
import { tryStartNextFollowup } from "./followup-autostart"
import { sendComposerMessage } from "./send-composer"

export function useFollowupAutostart() {
  const running = useChatStore((state) => state.running)
  const sessionId = useChatStore((state) => state.sessionId)
  const pendingApproval = useChatStore((state) => state.pendingApproval)

  useEffect(() => {
    function kick() {
      const store = useChatStore.getState()
      tryStartNextFollowup({
        sessionId: store.sessionId,
        running: store.running,
        pendingApproval: Boolean(store.pendingApproval),
        send: (item) => sendComposerMessage({ content: item.prompt, assets: item.assets })
      })
    }
    kick()
    return subscribeFollowups(kick)
  }, [running, sessionId, pendingApproval])
}
