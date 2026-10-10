/**
 * 窗口重新获得焦点时，把当前会话再报给 main。
 */
import { useEffect } from "react"
import { useChatStore } from "../stores/chat-store"
import { reportSessionFocus } from "./report-session-focus"

export function SessionFocusReporter() {
  useEffect(() => {
    const onFocus = () => {
      reportSessionFocus(useChatStore.getState().sessionId)
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])
  return null
}
