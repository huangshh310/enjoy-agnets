/**
 * 工作区 PTY 会话：打开、关闭。数据由 xterm 自己收。
 */
import { useEffect, useRef, useState } from "react"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"

export function useTerminalSession(workspaceId: string | null) {
  const t = useT()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<string | null>(null)

  useEffect(() => {
    if (!workspaceId || !hasIde()) return
    let cancelled = false
    sessionRef.current = null
    setSessionId(null)
    setError(null)
    void getIde()
      .terminal.open({ workspaceId })
      .then((result) => {
        if (cancelled) {
          void getIde().terminal.close({ sessionId: result.sessionId })
          return
        }
        sessionRef.current = result.sessionId
        setSessionId(result.sessionId)
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("chat.terminalFailed"))
      })
    return () => {
      cancelled = true
      if (sessionRef.current) void getIde().terminal.close({ sessionId: sessionRef.current })
    }
  }, [workspaceId, t])

  return { sessionId, error }
}
