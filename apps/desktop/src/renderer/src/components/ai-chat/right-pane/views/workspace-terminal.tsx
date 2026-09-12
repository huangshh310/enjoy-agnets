/**
 * xterm 接到本机 PTY：原始按键、可 resize，不再按行 input。
 */
import { useEffect, useRef } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import "@xterm/xterm/css/xterm.css"
import { getIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"

export function WorkspaceTerminal({
  sessionId
}: {
  sessionId: string
}) {
  const t = useT()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: 13,
      theme: {
        background: "transparent",
        foreground: "#d6d3d1",
        cursor: "#3b82f6"
      }
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host)
    fit.fit()
    termRef.current = term
    const dataSub = term.onData((data) => {
      void getIde().terminal.write({ sessionId, data })
    })
    const offData = getIde().terminal.onData((event) => {
      if (event.sessionId === sessionId) term.write(event.text)
    })
    const offExit = getIde().terminal.onExit((event) => {
      if (event.sessionId !== sessionId) return
      // 暗色弱化提示进程已结束，避免面板静默假活。
      term.write(`\r\n\x1b[2m${t("chat.terminalExited")}\x1b[0m\r\n`)
    })
    const resize = () => {
      fit.fit()
      void getIde().terminal.resize({
        sessionId,
        cols: term.cols,
        rows: term.rows
      })
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    return () => {
      observer.disconnect()
      dataSub.dispose()
      offData()
      offExit()
      term.dispose()
      termRef.current = null
    }
  }, [sessionId, t])

  return (
    <div
      ref={hostRef}
      className="min-h-0 flex-1 overflow-hidden bg-background-primary-default p-2"
      aria-label={t("chat.terminalInput")}
    />
  )
}
