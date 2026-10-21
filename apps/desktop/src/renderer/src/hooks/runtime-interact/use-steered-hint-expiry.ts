/**
 * 把 steeredHintExpired 接到界面：挂在输入框帽檐（ComposerFollowupRail，始终挂着）里，一个会话一份。
 */
import { useEffect, useRef } from "react"
import { useChatStore } from "../../stores/chat-store"
import type { RuntimeHintCode } from "../followup-queue"
import { clearSteeredHint, countUserMessages, STEERED_HINT_MAX_MS, steeredHintExpired } from "./steered-hint-expiry"

export function useSteeredHintExpiry(hint: RuntimeHintCode): void {
  const running = useChatStore((state) => state.running)
  const userCount = useChatStore((state) => countUserMessages(state.messages))
  const shownRef = useRef<{ at: number; userCount: number } | null>(null)

  // 提示出现：记下时间和当时的用户消息条数，30 秒后到点收。
  useEffect(() => {
    if (hint !== "steered") {
      shownRef.current = null
      return
    }
    shownRef.current = { at: Date.now(), userCount: countUserMessages(useChatStore.getState().messages) }
    const timer = window.setTimeout(() => void clearSteeredHint(), STEERED_HINT_MAX_MS)
    return () => window.clearTimeout(timer)
  }, [hint])

  // 这一轮结束 / 又发了一句：马上收。
  useEffect(() => {
    const shown = shownRef.current
    if (!shown) return
    if (
      steeredHintExpired({ hint, running, userCountAtShow: shown.userCount, userCount, elapsedMs: Date.now() - shown.at })
    ) {
      clearSteeredHint()
    }
  }, [hint, running, userCount])
}
