/**
 * 内置工具 (Built-in Tools) IPC 响应层：
 * 处理浏览器工具与桌面后台 Computer Use 的查询、开关、配对码重置与系统权限跳转。
 */
import { app, ipcMain, shell } from "electron"
import path from "node:path"
import fs from "node:fs"
import {
  DesktopMentionAppsResult,
  GetBuiltinToolsStateInput,
  OpenSystemPermissionInput,
  RevokeDesktopAlwaysAllowInput,
  ToggleBuiltinToolInput
} from "@enjoy-agents/ipc-contract"
import {
  checkDesktopPermissions,
  getBuiltinToolsState,
  openSystemPrivacySettings,
  regenerateBridgePairingCode,
  setBuiltinToolEnabled
} from "./services/builtin-tools/builtin-tools-state"
import { revokeDesktopAlwaysAllowApp } from "./services/builtin-tools/computer-use/desktop-always-allow-ledger"
import {
  stopBridgeServer,
  syncBridgeServerWithState
} from "./services/builtin-tools/bridge-server"
import { previewScreenOverlay } from "./services/builtin-tools/desktop-overlay-chrome"

export const BUILTIN_TOOLS_CHANNELS = [
  "builtinTools.getState",
  "builtinTools.toggle",
  "builtinTools.regeneratePairingCode",
  "builtinTools.getDesktopPermissions",
  "builtinTools.openSystemPermission",
  "builtinTools.revealExtensionDir",
  "builtinTools.previewOverlay",
  "builtinTools.desktopDoctor",
  "builtinTools.desktopView",
  "builtinTools.desktopCapturePreview",
  "builtinTools.desktopListApps",
  "builtinTools.revokeAlwaysAllow"
] as const

export function registerBuiltinToolsIpc() {
  ipcMain.handle("builtinTools.getState", async (_event, raw: unknown) => {
    const input = GetBuiltinToolsStateInput.parse(raw ?? {})
    return getBuiltinToolsState(input.sessionId)
  })

  ipcMain.handle("builtinTools.toggle", async (_event, raw: unknown) => {
    const input = ToggleBuiltinToolInput.parse(raw)
    const updated = setBuiltinToolEnabled(input.tool, input.enabled, input.sessionId)
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

  ipcMain.handle("builtinTools.desktopDoctor", async () => {
    const { runDesktopDoctor } = await import("./services/builtin-tools/computer-use/desktop-tools")
    return runDesktopDoctor()
  })

  ipcMain.handle("builtinTools.desktopView", async () => {
    const { readDesktopView } = await import("./services/builtin-tools/computer-use/desktop-tools")
    return readDesktopView()
  })

  ipcMain.handle("builtinTools.desktopCapturePreview", async () => {
    const { captureDesktopPreview } = await import("./services/builtin-tools/computer-use/desktop-tools")
    return captureDesktopPreview()
  })

  ipcMain.handle("builtinTools.desktopListApps", async () => {
    const { listDesktopMentionAppsIpc } = await import("./services/builtin-tools/computer-use/desktop-tools")
    return DesktopMentionAppsResult.parse(await listDesktopMentionAppsIpc())
  })

  ipcMain.handle("builtinTools.revokeAlwaysAllow", async (_event, raw: unknown) => {
    const input = RevokeDesktopAlwaysAllowInput.parse(raw)
    revokeDesktopAlwaysAllowApp(input.appKey)
    return getBuiltinToolsState(input.sessionId)
  })
}
