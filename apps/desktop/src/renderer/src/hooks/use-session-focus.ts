/**
 * 切会话、窗 focus/blur、关闭/unload 上报 session.setFocused。
 */
import { useEffect } from "react"
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
import { bindSessionFocusSender, reportSessionFocused } from "./session-focus"

export function useSessionFocus(): void {
  const sessionId = useChatStore((state) => state.sessionId)

  useEffect(() => {
    bindSessionFocusSender((input) => {
      if (!hasIde()) return
      const setFocused = getIde().session.setFocused
      if (typeof setFocused !== "function") return
      return setFocused(input)
    })
    return () => bindSessionFocusSender(null)
  }, [])

  useEffect(() => {
    reportSessionFocused(sessionId)
  }, [sessionId])

  useEffect(() => {
    const onFocus = () => reportSessionFocused(useChatStore.getState().sessionId)
    const onBlur = () => reportSessionFocused(null)
    const onUnload = () => reportSessionFocused(null, { immediate: true })
    window.addEventListener("focus", onFocus)
    window.addEventListener("blur", onBlur)
    window.addEventListener("pagehide", onUnload)
    window.addEventListener("beforeunload", onUnload)
    return () => {
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("pagehide", onUnload)
      window.removeEventListener("beforeunload", onUnload)
      reportSessionFocused(null, { immediate: true })
    }
  }, [])
}
