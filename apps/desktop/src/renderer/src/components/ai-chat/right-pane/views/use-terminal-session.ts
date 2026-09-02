/**
 * 工作区 shell 会话：打开、收 stdout、按行写 stdin。
 */
import { useEffect, useRef, useState } from "react"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"

export function useTerminalSession(workspaceId: string | null) {
  const t = useT()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [log, setLog] = useState("")
  const sessionRef = useRef<string | null>(null)

  useEffect(() => {
    if (!workspaceId || !hasIde()) return
    let cancelled = false
    sessionRef.current = null
    setSessionId(null)
    setLog("")

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
      .catch((error: unknown) => {
        setLog(error instanceof Error ? error.message : t("chat.terminalFailed"))
      })

    const offData = getIde().terminal.onData((event) => {
      if (sessionRef.current && event.sessionId === sessionRef.current) {
        setLog((prev) => prev + event.text)
      }
    })

    return () => {
      cancelled = true
      offData()
      if (sessionRef.current) void getIde().terminal.close({ sessionId: sessionRef.current })
    }
  }, [workspaceId, t])

  function writeLine(line: string) {
    if (!sessionId) return
    const payload = line.endsWith("\n") ? line : `${line}\n`
    void getIde().terminal.write({ sessionId, data: payload })
    setLog((prev) => `${prev}${line}\n`)
  }

  return { sessionId, log, writeLine }
}
