/**
 * xterm 接到本机 PTY：WebGL / 查找 / 外链 / Unicode 11。
 */
import { useEffect, useRef, useState } from "react"
import "@xterm/xterm/css/xterm.css"
import { useT } from "@renderer/i18n"
import type { TerminalSearchApi } from "./terminal/attach-xterm-addons"
import { TerminalSearchBar } from "./terminal/terminal-search-bar"
import { mountWorkspaceTerminal } from "./terminal/mount-workspace-terminal"
import { useTerminalFindHotkey } from "./terminal/use-terminal-find-hotkey"

export function WorkspaceTerminal({ sessionId }: { sessionId: string }) {
  const t = useT()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const paneRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<TerminalSearchApi | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    return mountWorkspaceTerminal({
      host,
      sessionId,
      exitedLabel: t("chat.terminalExited"),
      onSearch: (api) => {
        searchRef.current = api
      }
    })
  }, [sessionId, t])

  useTerminalFindHotkey(paneRef, findOpen, setFindOpen, setQuery)

  return (
    <div
      ref={paneRef}
      data-terminal-pane
      className="relative min-h-0 flex-1 overflow-hidden bg-background-primary-default"
    >
      <TerminalSearchBar
        open={findOpen}
        query={query}
        onQuery={setQuery}
        onClose={() => {
          setFindOpen(false)
          setQuery("")
        }}
        searchApi={searchRef.current}
      />
      <div
        ref={hostRef}
        className="min-h-0 h-full overflow-hidden p-2"
        aria-label={t("chat.terminalInput")}
      />
    </div>
  )
}
