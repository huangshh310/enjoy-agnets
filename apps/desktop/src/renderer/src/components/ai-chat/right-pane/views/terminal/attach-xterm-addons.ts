/**
 * 装 Fit / Unicode11 / Search / WebLinks；WebGL 另在 open 之后装。
 */
import { FitAddon } from "@xterm/addon-fit"
import { SearchAddon } from "@xterm/addon-search"
import { Unicode11Addon } from "@xterm/addon-unicode11"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { WebglAddon } from "@xterm/addon-webgl"
import type { Terminal } from "@xterm/xterm"
import { requestOpenExternalQuiet } from "@renderer/lib/open-safe-external"
import { openTerminalLink } from "./open-terminal-link"
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

/**
 * 只给 WebLinksAddon 的用户点击回调。不要从 effect / 定时器 / 自动扫描调用。
 * 外链走 `lib/open-safe-external`（与删档案作废同一出口）。
 */
export function onTerminalLinkActivate(_event: MouseEvent, uri: string): void {
  openTerminalLink(uri, requestOpenExternalQuiet)
}

export { requestOpenExternalQuiet }

export function attachXtermAddons(term: Terminal): AttachedXtermAddons {
  const fit = new FitAddon()
  const search = new SearchAddon()
  term.loadAddon(fit)
  term.loadAddon(new Unicode11Addon())
  term.unicode.activeVersion = "11"
  term.loadAddon(search)
  term.loadAddon(new WebLinksAddon(onTerminalLinkActivate))
  return {
    fit,
    search: {
      findNext: (query) => search.findNext(query),
      findPrevious: (query) => search.findPrevious(query),
      clearDecorations: () => search.clearDecorations()
    }
  }
}

/** 必须在 term.open 之后调用：WebGL 需要 canvas。失败 / context loss 回落 DOM。 */
export function attachXtermRenderer(
  term: Terminal,
  onMode?: (mode: "webgl" | "dom") => void
): "webgl" | "dom" {
  return attachWebglOrDom(
    (addon) => term.loadAddon(addon as never),
    () => new WebglAddon(),
    onMode
  )
}
