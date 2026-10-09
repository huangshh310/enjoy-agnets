/**
 * 终端链接：只走 main window.openExternal，禁止 renderer window.open。
 */
import { parseHttpUrl } from "@renderer/lib/http-url"
import { getIde } from "@renderer/lib/ide"

export type OpenExternalHttp = (url: string) => void

export function openTerminalLink(raw: string, openExternal: OpenExternalHttp): void {
  const url = parseHttpUrl(raw)
  if (!url) return
  openExternal(url)
}

export function openTerminalLinkViaIde(raw: string): void {
  openTerminalLink(raw, (url) => {
    void getIde().window.openExternal({ url })
  })
}
