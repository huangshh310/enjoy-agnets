/**
 * Environment 浮层：Esc 关闭；换会话（含新对话）或换路由也关。
 */
import { useEffect, useRef } from "react"
import { shouldDismissEnvironment } from "./environment-dismiss"

export function useEnvironmentDismiss(input: {
  open: boolean
  onClose: () => void
  sessionId: string | null
  pathname: string
  findOpen: boolean
}): void {
  const { open, onClose, sessionId, pathname, findOpen } = input
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const skipFirstNav = useRef(true)

  useEffect(() => {
    if (skipFirstNav.current) {
      skipFirstNav.current = false
      return
    }
    onCloseRef.current()
  }, [sessionId, pathname])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (
        !shouldDismissEnvironment({
          key: event.key,
          defaultPrevented: event.defaultPrevented,
          findOpen
        })
      ) {
        return
      }
      event.preventDefault()
      onCloseRef.current()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, findOpen])
}
