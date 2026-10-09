/**
 * 挂上 xterm + PTY：原始按键、addons、WebGL 回落。
 */
import { Terminal } from "@xterm/xterm"
import { getIde } from "@renderer/lib/ide"
import { attachXtermAddons, attachXtermRenderer, type TerminalSearchApi } from "./attach-xterm-addons"

export function createWorkspaceXterm(): Terminal {
  return new Terminal({
    cursorBlink: true,
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: 13,
    theme: {
      background: "transparent",
      foreground: "#d6d3d1",
      cursor: "#3b82f6"
    }
  })
}

export function mountWorkspaceTerminal(input: {
  host: HTMLDivElement
  sessionId: string
  exitedLabel: string
  onSearch: (api: TerminalSearchApi | null) => void
}): () => void {
  const term = createWorkspaceXterm()
  const addons = attachXtermAddons(term)
  term.open(input.host)
  attachXtermRenderer(term)
  addons.fit.fit()
  input.onSearch(addons.search)
  const unbind = bindPty(term, input.sessionId, input.exitedLabel)
  const resize = () => {
    addons.fit.fit()
    void getIde().terminal.resize({
      sessionId: input.sessionId,
      cols: term.cols,
      rows: term.rows
    })
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(input.host)
  return () => {
    observer.disconnect()
    unbind()
    input.onSearch(null)
    term.dispose()
  }
}

function bindPty(term: Terminal, sessionId: string, exitedLabel: string): () => void {
  const dataSub = term.onData((data) => {
    void getIde().terminal.write({ sessionId, data })
  })
  const offData = getIde().terminal.onData((event) => {
    if (event.sessionId === sessionId) term.write(event.text)
  })
  const offExit = getIde().terminal.onExit((event) => {
    if (event.sessionId !== sessionId) return
    term.write(`\r\n\x1b[2m${exitedLabel}\x1b[0m\r\n`)
  })
  return () => {
    dataSub.dispose()
    offData()
    offExit()
  }
}
