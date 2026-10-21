/**
 * 当前任务回 idle、或已 idle 时新入队，自动取出再走 sendComposerMessage。
 */
import { useEffect } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { subscribeFollowups } from "./followup-queue"
import { tryStartNextFollowup } from "./followup-autostart"
import { sendComposerMessage } from "./send-composer"
import { dropSkipSendScroll, lastUserMessageId, skipNextSendScroll } from "../components/ai-chat/thread/scroll-on-send"

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
        send: (item) => {
          // 排队那条自己发出去不是用户刚发的：这次别把正往上翻着的人拽回底部（host #170，一次性记号）。
          // 发完用户消息根本没换（被拦下 / 没发出去）：记号撤掉，不留着吞后面用户自己那一发的贴底。
          // 只看「最后一条用户消息变没变」，不和对话区取记号的那次渲染抢先后。
          const before = lastUserMessageId(useChatStore.getState().messages)
          const mark = skipNextSendScroll(item.sessionId)
          return sendComposerMessage({ content: item.prompt, assets: item.assets }).finally(() => {
            if (lastUserMessageId(useChatStore.getState().messages) === before) dropSkipSendScroll(mark)
          })
        }
      })
    }
    kick()
    return subscribeFollowups(kick)
  }, [running, sessionId, pendingApproval])
}
