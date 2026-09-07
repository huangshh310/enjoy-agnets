/**
 * 自动更新 IPC：status 只读快照；check / download / install 才有副作用。
 */
import { ipcMain } from "electron"
import { AppUpdateActionInput } from "@enjoy-agents/ipc-contract"
import {
  checkForAppUpdate,
  downloadAppUpdate,
  getAppUpdateSnapshot,
  installAppUpdate
} from "./services/app-update"

export const APP_UPDATE_CHANNELS = [
  "app.update.status",
  "app.update.check",
  "app.update.download",
  "app.update.install"
] as const

export function registerAppUpdateIpc(): void {
  ipcMain.handle("app.update.status", (_event, raw) => {
    AppUpdateActionInput.parse(raw ?? {})
    return getAppUpdateSnapshot()
  })
  ipcMain.handle("app.update.check", async (_event, raw) => {
    AppUpdateActionInput.parse(raw ?? {})
    return checkForAppUpdate()
  })
  ipcMain.handle("app.update.download", async (_event, raw) => {
    AppUpdateActionInput.parse(raw ?? {})
    return downloadAppUpdate()
  })
  ipcMain.handle("app.update.install", (_event, raw) => {
    AppUpdateActionInput.parse(raw ?? {})
    return installAppUpdate()
  })
}
