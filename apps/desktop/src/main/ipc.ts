/**
 * IPC 总注册：壳 / 设置 / AI 频道。卸载必须成对。
 */
import { BrowserWindow, ipcMain } from "electron"
import { AI_CHANNELS, registerAiIpc, unregisterAiIpc } from "./ipc-ai"
import { SETTINGS_CHANNELS, registerSettingsIpc } from "./ipc-settings"
import { SHELL_CHANNELS, registerShellIpc } from "./ipc-shell"
import { SKILLS_CHANNELS, registerSkillsIpc } from "./ipc-skills"

const CHANNELS = [...SHELL_CHANNELS, ...SETTINGS_CHANNELS, ...AI_CHANNELS, ...SKILLS_CHANNELS] as const

let ipcRegistered = false

export function registerIpc(window: BrowserWindow) {
  if (ipcRegistered) return
  ipcRegistered = true
  bindMaximizeEvents(window)
  registerShellIpc()
  registerSettingsIpc()
  registerSkillsIpc()
  registerAiIpc()
}

export function unregisterIpc() {
  if (!ipcRegistered) return
  for (const channel of CHANNELS) ipcMain.removeHandler(channel)
  unregisterAiIpc()
  ipcRegistered = false
}

function bindMaximizeEvents(window: BrowserWindow) {
  const send = (isMaximized: boolean) => {
    if (!window.isDestroyed()) {
      window.webContents.send("window.maximized-changed", { isMaximized })
    }
  }
  window.on("maximize", () => send(true))
  window.on("unmaximize", () => send(false))
  window.on("restore", () => send(window.isMaximized()))
}
