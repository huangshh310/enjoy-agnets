/**
 * Windows 侧键会发 app-command，Chromium 接着走 history.back()。
 * 页面历史在渲染进程。这里只拦住原生导航，不代替后退/前进。
 */
import type { BrowserWindow } from "electron"

export function blockNativeHistoryNavigation(win: BrowserWindow): void {
  win.on("app-command", (event, command) => {
    if (command !== "browser-backward" && command !== "browser-forward") return
    event.preventDefault()
  })
}
