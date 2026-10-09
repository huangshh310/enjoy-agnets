/**
 * 终端链接：只走注入的 openExternal，禁止渲染进程自己开窗。
 */
import { parseHttpUrl } from "../../../../../lib/http-url.ts"

export type OpenExternalHttp = (url: string) => void

export function openTerminalLink(raw: string, openExternal: OpenExternalHttp): void {
  const url = parseHttpUrl(raw)
  if (!url) return
  openExternal(url)
}
