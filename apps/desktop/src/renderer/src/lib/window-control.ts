/**
 * 窗口控制相关方法：调用 Electron 主进程控制最小化、最大化/还原、关闭
 */
import { getIde, hasIde } from "./ide"

function windowBridge() {
  return hasIde() && getIde().window ? getIde().window : null
}

export async function minimizeWindow(): Promise<void> {
  const win = windowBridge()
  if (win) {
    await win.minimize()
  }
}

export async function toggleMaximizeWindow(): Promise<boolean> {
  const win = windowBridge()
  if (win) {
    const res = await win.toggleMaximize()
    return res.isMaximized
  }
  return false
}

export async function closeWindow(): Promise<void> {
  const win = windowBridge()
  if (win) {
    await win.close()
  }
}

export async function forceQuitWindow(): Promise<void> {
  const win = windowBridge()
  if (win?.forceQuit) {
    await win.forceQuit()
    return
  }
  await closeWindow()
}

export function onQuitRequested(callback: () => void): () => void {
  const win = windowBridge()
  if (win?.onQuitRequested) {
    return win.onQuitRequested(callback)
  }
  return () => {}
}

export async function checkIsMaximized(): Promise<boolean> {
  const win = windowBridge()
  if (win) {
    const res = await win.isMaximized()
    return res.isMaximized
  }
  return false
}

export function onMaximizedChange(callback: (isMaximized: boolean) => void): () => void {
  const win = windowBridge()
  if (win?.onMaximizedChange) {
    return win.onMaximizedChange(callback)
  }
  return () => {}
}
