/**
 * Computer Use overlay 窗：透明置顶、默认点穿。铬显隐由 desktop-overlay-chrome 驱动。
 */
import { app, BrowserWindow, ipcMain, screen } from "electron"
import path from "node:path"
import fs from "node:fs"

let overlayWindow: BrowserWindow | null = null
let overlayIpcBound = false

export type OverlayChromePayload = {
  visible: boolean
  title?: string
  stopLabel?: string
  escHint?: string
  lang?: "zh-CN" | "en"
  /** 自定义指针只改蓝边颜色，不注入系统光标。 */
  pointerColor?: string
}

export function isOverlayWindow(win: BrowserWindow): boolean {
  return overlayWindow !== null && win === overlayWindow
}

function resolveOverlayFile(fileName: string): string {
  const candidates = [
    path.join(app.getAppPath(), "resources/overlay", fileName),
    path.join(process.cwd(), "apps/desktop/resources/overlay", fileName),
    path.resolve(__dirname, "../../resources/overlay", fileName),
    path.resolve(__dirname, "../../../resources/overlay", fileName)
  ]
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {
      // 候选路径不存在就试下一个
    }
  }
  return candidates[0]
}

function bindOverlayIpcOnce(): void {
  if (overlayIpcBound) return
  overlayIpcBound = true
  ipcMain.on("overlay:stop", () => {
    void import("./desktop-overlay-chrome").then(({ stopDesktopActOverlay }) => {
      void stopDesktopActOverlay()
    })
  })
  ipcMain.on("overlay:ignore-mouse", (_event, ignore: unknown) => {
    setOverlayIgnoreMouse(ignore !== false)
  })
}

export function ensureOverlayWindow(): BrowserWindow {
  bindOverlayIpcOnce()
  if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow

  const bounds = screen.getPrimaryDisplay().bounds
  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: false,
    skipTaskbar: true,
    enableLargerThanScreen: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: resolveOverlayFile("overlay-preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  overlayWindow.setAlwaysOnTop(true, "screen-saver")
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  void overlayWindow.loadFile(resolveOverlayFile("computer-use-overlay.html"))
  overlayWindow.on("closed", () => {
    overlayWindow = null
  })
  return overlayWindow
}

/** HUD 可点时关掉点穿；离开 HUD 再点穿，避免挡住本机目标窗。 */
export function setOverlayIgnoreMouse(ignore: boolean): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayWindow.setIgnoreMouseEvents(ignore, { forward: true })
}

export function sendOverlayChrome(payload: OverlayChromePayload): void {
  if (!payload.visible) {
    hideOverlayWindow()
    return
  }
  const win = ensureOverlayWindow()
  if (!win.isVisible()) win.showInactive()
  const push = () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    overlayWindow.webContents.send("overlay:chrome", payload)
  }
  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", push)
    return
  }
  push()
}

function hideOverlayWindow(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayWindow.webContents.send("overlay:chrome", { visible: false })
  setOverlayIgnoreMouse(true)
  overlayWindow.hide()
}

export function disposeOverlayWindow(): void {
  void import("./desktop-overlay-chrome").then(({ resetDesktopOverlayChrome }) => {
    resetDesktopOverlayChrome()
  })
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    try {
      overlayWindow.close()
    } catch {
      // 退出时窗可能已毁
    }
  }
  overlayWindow = null
}
