/**
 * 内置工具 (Built-in Tools) IPC 响应层：
 * 处理浏览器工具与桌面后台 Computer Use 的查询、开关、配对码重置与系统权限跳转。
 */
import { app, ipcMain, shell } from "electron"
import path from "node:path"
import fs from "node:fs"
import {
  OpenSystemPermissionInput,
  ToggleBuiltinToolInput
} from "@enjoy-agents/ipc-contract"
import {
  checkDesktopPermissions,
  getBuiltinToolsState,
  openSystemPrivacySettings,
  regenerateBridgePairingCode,
  setBuiltinToolEnabled
} from "./services/builtin-tools/builtin-tools-state"
import {
  stopBridgeServer,
  syncBridgeServerWithState
} from "./services/builtin-tools/bridge-server"
import { previewScreenOverlay } from "./services/builtin-tools/screen-overlay-service"

export const BUILTIN_TOOLS_CHANNELS = [
  "builtinTools.getState",
  "builtinTools.toggle",
  "builtinTools.regeneratePairingCode",
  "builtinTools.getDesktopPermissions",
  "builtinTools.openSystemPermission",
  "builtinTools.revealExtensionDir",
  "builtinTools.previewOverlay"
] as const

export function registerBuiltinToolsIpc() {
  ipcMain.handle("builtinTools.getState", async () => {
    return getBuiltinToolsState()
  })

  ipcMain.handle("builtinTools.toggle", async (_event, raw: unknown) => {
    const input = ToggleBuiltinToolInput.parse(raw)
    const updated = setBuiltinToolEnabled(input.tool, input.enabled)
    if (input.tool === "browserBridge") {
      await syncBridgeServerWithState()
    }
    return updated
  })

  ipcMain.handle("builtinTools.regeneratePairingCode", async () => {
    const updated = regenerateBridgePairingCode()
    // 配对码重置后，关闭旧连接并要求重新握手
    await stopBridgeServer()
    await syncBridgeServerWithState()
    return updated
  })

  ipcMain.handle("builtinTools.getDesktopPermissions", async () => {
    return checkDesktopPermissions()
  })

  ipcMain.handle("builtinTools.openSystemPermission", async (_event, raw: unknown) => {
    const input = OpenSystemPermissionInput.parse(raw)
    openSystemPrivacySettings(input.permission)
    return { ok: true as const }
  })

  ipcMain.handle("builtinTools.revealExtensionDir", async () => {
    const candidates = [
      path.join(app.getAppPath(), "resources/chrome-extension"),
      path.join(process.cwd(), "apps/browser-extension"),
      path.resolve(__dirname, "../../../apps/browser-extension")
    ]
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        await shell.openPath(c)
        return { ok: true as const }
      }
    }
    return { ok: false as const }
  })

  ipcMain.handle("builtinTools.previewOverlay", async () => {
    previewScreenOverlay()
    return { ok: true as const }
  })
}
