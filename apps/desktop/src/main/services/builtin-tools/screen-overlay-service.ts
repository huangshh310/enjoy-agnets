/**
 * macOS Computer Use 屏幕实时视觉反馈服务 (参考 CodeX 交互范式)：
 * 维护置顶透明无焦点覆盖层，提供全屏安全操作呼吸边框、顶部状态 HUD 胶囊与精准坐标点击波纹。
 */
import { app, BrowserWindow, screen } from "electron"
import path from "node:path"
import fs from "node:fs"
import { getBuiltinToolsState } from "./builtin-tools-state"

let overlayWindow: BrowserWindow | null = null

export interface ScreenActionPayload {
  action: "click" | "type" | "observe" | "custom"
  x?: number
  y?: number
  text?: string
  targetName?: string
}

function resolveOverlayFile(fileName: string): string {
  const candidates = [
    path.join(app.getAppPath(), "resources/overlay", fileName),
    path.join(process.cwd(), "apps/desktop/resources/overlay", fileName),
    path.resolve(__dirname, "../../resources/overlay", fileName),
    path.resolve(__dirname, "../../../resources/overlay", fileName)
  ]
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c
    } catch {
      // ignore
    }
  }
  return candidates[0]
}

export function ensureOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const bounds = primaryDisplay.bounds

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

  // macOS 穿透与置顶保障：完全忽略鼠标点击，不干扰用户正在进行的工作
  overlayWindow.setAlwaysOnTop(true, "screen-saver")
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })

  const htmlPath = resolveOverlayFile("computer-use-overlay.html")
  void overlayWindow.loadFile(htmlPath)

  overlayWindow.on("closed", () => {
    overlayWindow = null
  })

  return overlayWindow
}

/**
 * 触发一次屏幕视觉反馈动效
 */
export function triggerScreenAction(payload: ScreenActionPayload): void {
  const state = getBuiltinToolsState()
  if (!state.computerUse.enabled || !state.computerUse.screenVisuals) {
    return
  }

  try {
    const win = ensureOverlayWindow()
    if (!win.isVisible()) {
      win.showInactive()
    }
    win.webContents.send("overlay:action", payload)
  } catch (err) {
    console.warn("Failed to trigger screen overlay action", err)
  }
}

/**
 * 供设置页面随时调用的测试预览动效
 */
export function previewScreenOverlay(): void {
  try {
    const win = ensureOverlayWindow()
    if (!win.isVisible()) {
      win.showInactive()
    }
    const bounds = screen.getPrimaryDisplay().bounds
    const centerX = Math.round(bounds.width / 2)
    const centerY = Math.round(bounds.height / 2)

    win.webContents.send("overlay:action", {
      action: "click",
      x: centerX,
      y: centerY,
      text: "正在执行示例点击操作 · 屏幕动效运行正常",
      targetName: "预览中心"
    })
  } catch (err) {
    console.warn("Failed to preview screen overlay", err)
  }
}

/**
 * 退出清理
 */
export function disposeOverlayWindow(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    try {
      overlayWindow.close()
    } catch {
      // ignore
    }
    overlayWindow = null
  }
}
