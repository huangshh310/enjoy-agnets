/**
 * AppSnap IPC。截图只在 main。渲染进程拿 PNG 后贴进 Composer。
 */
import { ipcMain } from "electron"
import { AppsnapCaptureInput, AppsnapListResult } from "@enjoy-agents/ipc-contract"
import { readPreferences } from "./services/preferences"
import { appsnapDoctor, appsnapList } from "./services/appsnap/appsnap-rpc"
import { publishAppsnapWindow, stopAppsnapHotkey, syncAppsnapHotkey } from "./services/appsnap/appsnap-hotkey"

export const APPSNAP_CHANNELS = ["appsnap.doctor", "appsnap.listWindows", "appsnap.capture"] as const

export function registerAppsnapIpc(): void {
  const prefs = readPreferences()
  syncAppsnapHotkey({
    appsnapEnabled: prefs.appsnapEnabled,
    appsnapChord: prefs.appsnapChord,
    keybindings: prefs.keybindings
  })
  ipcMain.handle("appsnap.doctor", async () => appsnapDoctor())
  ipcMain.handle("appsnap.listWindows", async () => AppsnapListResult.parse(await appsnapList()))
  ipcMain.handle("appsnap.capture", async (_event, raw) => {
    const input = AppsnapCaptureInput.parse(raw ?? {})
    return publishAppsnapWindow(input.windowId)
  })
}

export function unregisterAppsnapIpc(): void {
  stopAppsnapHotkey()
}
