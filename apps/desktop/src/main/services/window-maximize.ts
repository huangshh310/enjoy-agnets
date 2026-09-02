/**
 * Windows 透明无边框：maximize/unmaximize 经常空转。
 * 放大用 workArea setBounds，还原用放大前记住的矩形。
 */
import { BrowserWindow, screen, type Rectangle } from "electron"
import {
  isFilledWorkArea,
  planMaximizeToggle,
  type Rect
} from "./window-maximize-plan"

const savedBounds = new WeakMap<BrowserWindow, Rectangle>()

/** Windows 标题栏 drag 区域双击。 */
export const WM_NCLBUTTONDBLCLK = 0x00A3

export function queryIsMaximized(win: BrowserWindow): boolean {
  if (win.isMaximized()) return true
  const bounds = win.getBounds()
  const work = screen.getDisplayMatching(bounds).workArea
  return isFilledWorkArea(asRect(bounds), asRect(work))
}

export function toggleMaximize(win: BrowserWindow): boolean {
  const bounds = win.getBounds()
  const work = screen.getDisplayMatching(bounds).workArea
  const plan = planMaximizeToggle({
    osMaximized: win.isMaximized(),
    bounds: asRect(bounds),
    workArea: asRect(work),
    saved: savedBounds.get(win)
  })
  if (plan.action === "restore") restoreWindow(win, plan.restoreTo)
  else {
    savedBounds.set(win, bounds)
    fillWorkArea(win, work)
  }
  return queryIsMaximized(win)
}

/** 标题栏 drag 双击：先自己切换，若 Chromium 随后又 maximize 再纠一次。 */
export function handleCaptionDoubleClick(win: BrowserWindow, onChange: () => void) {
  const shouldFill = !queryIsMaximized(win)
  toggleMaximize(win)
  onChange()
  setImmediate(() => {
    if (win.isDestroyed()) return
    if (shouldFill !== queryIsMaximized(win)) toggleMaximize(win)
    onChange()
  })
}

function fillWorkArea(win: BrowserWindow, work: Rectangle) {
  if (process.platform === "win32") {
    win.setBounds(work)
    return
  }
  win.maximize()
}

function restoreWindow(win: BrowserWindow, prev: Rect | undefined) {
  if (win.isMaximized()) win.unmaximize()
  if (!queryIsMaximized(win)) return
  win.setBounds(prev ?? fallbackBounds(win))
}

function fallbackBounds(win: BrowserWindow): Rectangle {
  const work = screen.getDisplayMatching(win.getBounds()).workArea
  const width = Math.min(1440, Math.max(1100, work.width - 160))
  const height = Math.min(920, Math.max(720, work.height - 120))
  return {
    x: work.x + Math.round((work.width - width) / 2),
    y: work.y + Math.round((work.height - height) / 2),
    width,
    height
  }
}

function asRect(rect: Rectangle): Rect {
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
}
