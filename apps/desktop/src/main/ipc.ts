/**
 * IPC 总注册：壳 / 设置 / AI 频道。卸载必须成对。
 */
import { BrowserWindow, ipcMain } from "electron"
import { AI_CHANNELS, registerAiIpc, unregisterAiIpc } from "./ipc-ai"
import { SETTINGS_CHANNELS, registerSettingsIpc } from "./ipc-settings"
import { SHELL_CHANNELS, registerShellIpc } from "./ipc-shell"
import { SESSION_CHANNELS, registerSessionIpc } from "./ipc-session"
import { SKILLS_CHANNELS, registerSkillsIpc } from "./ipc-skills"
import { SKILL_SOURCE_CHANNELS, registerSkillSourceIpc } from "./ipc-skill-sources"
import { RULES_CHANNELS, registerRulesIpc } from "./ipc-rules"
import { AGENT_TOOLS_CHANNELS, registerAgentToolsIpc } from "./ipc-agent-tools"
import { APP_UPDATE_CHANNELS, registerAppUpdateIpc } from "./ipc-app-update"
import { handleCaptionDoubleClick, queryIsMaximized, WM_NCLBUTTONDBLCLK } from "./services/window-maximize"

const CHANNELS = [
  ...SHELL_CHANNELS,
  ...SESSION_CHANNELS,
  ...SETTINGS_CHANNELS,
  ...AI_CHANNELS,
  ...SKILLS_CHANNELS,
  ...SKILL_SOURCE_CHANNELS,
  ...RULES_CHANNELS,
  ...AGENT_TOOLS_CHANNELS,
  ...APP_UPDATE_CHANNELS
] as const

let ipcRegistered = false

export function registerIpc(window: BrowserWindow) {
  if (ipcRegistered) return
  ipcRegistered = true
  bindMaximizeEvents(window)
  registerShellIpc()
  registerSessionIpc()
  registerSettingsIpc()
  registerSkillsIpc()
  registerSkillSourceIpc()
  registerRulesIpc()
  registerAgentToolsIpc()
  registerAiIpc()
  registerAppUpdateIpc()
}

export function unregisterIpc() {
  if (!ipcRegistered) return
  for (const channel of CHANNELS) ipcMain.removeHandler(channel)
  unregisterAiIpc()
  ipcRegistered = false
}

function bindMaximizeEvents(window: BrowserWindow) {
  const send = () => {
    if (!window.isDestroyed()) {
      window.webContents.send("window.maximized-changed", {
        isMaximized: queryIsMaximized(window)
      })
    }
  }
  window.on("maximize", send)
  window.on("unmaximize", send)
  window.on("restore", send)
  if (process.platform === "win32") {
    window.hookWindowMessage(WM_NCLBUTTONDBLCLK, () => {
      handleCaptionDoubleClick(window, send)
    })
  }
}
