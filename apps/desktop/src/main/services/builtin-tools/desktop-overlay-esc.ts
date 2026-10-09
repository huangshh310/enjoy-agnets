/**
 * 操控进行时的 Esc。
 * 未授权输入监听：只在 Enjoy 窗口里生效。
 * 签名 helper 已授权：再用全局快捷键，别的应用在前台也能停。
 */
import { BrowserWindow, globalShortcut, type Input } from "electron"
import { inputMonitoringStopsGlobally, watchInputMonitoring } from "./desktop-input-watch"
import { isOverlayWindow } from "./screen-overlay-service"

let localStops: Array<() => void> = []
let globalBound = false
let stopAct: (() => void) | null = null

export function bindOverlayEscape(onStop: () => void): void {
  stopAct = onStop
  bindLocalEsc()
  if (inputMonitoringStopsGlobally()) bindGlobalEsc()
}

export function unbindOverlayEscape(): void {
  for (const stop of localStops) stop()
  localStops = []
  unbindGlobalEsc()
  stopAct = null
}

watchInputMonitoring(() => {
  if (!stopAct) return
  if (inputMonitoringStopsGlobally()) bindGlobalEsc()
  else unbindGlobalEsc()
})

function bindLocalEsc(): void {
  if (localStops.length > 0) return
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed() || isOverlayWindow(win)) continue
    const handler = (event: Electron.Event, input: Input) => onLocalEscape(event, input)
    win.webContents.on("before-input-event", handler)
    localStops.push(() => {
      if (!win.isDestroyed()) win.webContents.removeListener("before-input-event", handler)
    })
  }
}

function onLocalEscape(event: Electron.Event, input: Input): void {
  if (input.type !== "keyDown" || input.key !== "Escape") return
  event.preventDefault()
  stopAct?.()
}

function bindGlobalEsc(): void {
  if (globalBound) return
  try {
    globalBound = globalShortcut.register("Escape", () => stopAct?.())
  } catch {
    globalBound = false
  }
}

function unbindGlobalEsc(): void {
  if (!globalBound) return
  try {
    globalShortcut.unregister("Escape")
  } catch {
    // 其它模块可能已经卸过
  }
  globalBound = false
}
