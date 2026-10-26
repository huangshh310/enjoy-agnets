/**
 * 当前任务回 idle、或已 idle 时新入队，自动取出再走 sendComposerMessage。
 */
import { useEffect } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { subscribeFollowups } from "./followup-queue"
import { tryStartNextFollowup } from "./followup-autostart"
import { sendComposerMessage } from "./send-composer"
import { lastUserMessageId, runQueuedAutoSend } from "../components/ai-chat/thread/scroll-on-send"

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
        // 排队那条自己发出去不是用户刚发的：这次别把正往上翻着的人拽回底部（host #170，一次性记号）；
        // 用户刚点了排队区「继续」时照常贴底（luna #170 r-luna ②）。没发出去就撤掉记号（runQueuedAutoSend）。
        send: (item) =>
          runQueuedAutoSend(
            item.sessionId,
            () => lastUserMessageId(useChatStore.getState().messages),
            () => sendComposerMessage({ content: item.prompt, assets: item.assets })
          )
      })
    }
    kick()
    return subscribeFollowups(kick)
  }, [running, sessionId, pendingApproval])
}
