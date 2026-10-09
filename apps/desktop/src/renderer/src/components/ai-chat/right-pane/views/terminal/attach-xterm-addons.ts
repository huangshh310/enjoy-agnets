/**
 * 装 Fit / Unicode11 / Search / WebLinks；WebGL 另在 open 之后装。
 */
import { FitAddon } from "@xterm/addon-fit"
import { SearchAddon } from "@xterm/addon-search"
import { Unicode11Addon } from "@xterm/addon-unicode11"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { WebglAddon } from "@xterm/addon-webgl"
import type { Terminal } from "@xterm/xterm"
import { openTerminalLinkViaIde } from "./open-terminal-link"
import { attachWebglOrDom } from "./xterm-webgl"

export type TerminalSearchApi = {
  findNext: (query: string) => boolean
  findPrevious: (query: string) => boolean
  clearDecorations: () => void
}

export type AttachedXtermAddons = {
  fit: FitAddon
  search: TerminalSearchApi
}

export function attachXtermAddons(term: Terminal): AttachedXtermAddons {
  const fit = new FitAddon()
  const search = new SearchAddon()
  term.loadAddon(fit)
  term.loadAddon(new Unicode11Addon())
  term.unicode.activeVersion = "11"
  term.loadAddon(search)
  term.loadAddon(new WebLinksAddon((_event, uri) => {
    openTerminalLinkViaIde(uri)
  }))
  return {
    fit,
    search: {
      findNext: (query) => search.findNext(query),
      findPrevious: (query) => search.findPrevious(query),
      clearDecorations: () => search.clearDecorations()
    }
  }
}

/** 必须在 term.open 之后调用：WebGL 需要 canvas。失败回落 DOM。 */
export function attachXtermRenderer(term: Terminal): "webgl" | "dom" {
  return attachWebglOrDom(
    (addon) => term.loadAddon(addon as never),
    () => new WebglAddon()
  )
}
