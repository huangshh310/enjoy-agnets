/**
 * 把 steeredHintExpired 接到界面：挂在输入框帽檐（ComposerFollowupRail，始终挂着）里，一个会话一份。
 */
import { useEffect, useRef, useState } from "react"
import { useChatStore } from "../../stores/chat-store"
import type { RuntimeHintCode } from "../followup-queue"
import {
  clearSteeredHint,
  countUserMessages,
  STEERED_HINT_MAX_MS,
  steeredHintExpired,
  steeredHintRestarted
} from "./steered-hint-expiry"

type Shown = { at: number; userCount: number; runId: string | null }

export function useSteeredHintExpiry(hint: RuntimeHintCode): void {
  const running = useChatStore((state) => state.running)
  const runId = useChatStore((state) => state.runId)
  const userCount = useChatStore((state) => countUserMessages(state.messages))
  const shownRef = useRef<Shown | null>(null)
  // 每插一句加一，30 秒计时器跟着重开。
  const [stamp, setStamp] = useState(0)

  // 提示出现：记下时间、当时的用户消息条数和这一轮的 runId。
  useEffect(() => {
    if (hint !== "steered") {
      shownRef.current = null
      return
    }
    const state = useChatStore.getState()
    shownRef.current = { at: Date.now(), userCount: countUserMessages(state.messages), runId: state.runId }
  }, [hint])

  // 30 秒后到点收；又插了一句（stamp 变了）就从头算。
  useEffect(() => {
    if (hint !== "steered") return
    const timer = window.setTimeout(() => void clearSteeredHint(), STEERED_HINT_MAX_MS)
    return () => window.clearTimeout(timer)
  }, [hint, stamp])

  // 同一轮里又插了一句：重新记、重新计时；这一轮结束 / 换了一轮又发了一句：马上收。
  useEffect(() => {
    const shown = shownRef.current
    if (!shown) return
    if (steeredHintRestarted({ hint, running, userCountAtShow: shown.userCount, userCount, runIdAtShow: shown.runId, runId })) {
      shownRef.current = { at: Date.now(), userCount, runId }
      setStamp((n) => n + 1)
      return
    }
    if (
      steeredHintExpired({ hint, running, userCountAtShow: shown.userCount, userCount, elapsedMs: Date.now() - shown.at })
    ) {
      clearSteeredHint()
    }
  }, [hint, running, runId, userCount])
}
