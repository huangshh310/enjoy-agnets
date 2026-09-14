/**
 * 内置工具 (Builtin Tools) 状态与持久化：
 * 包含内置浏览器、Browser Bridge 与 macOS 后台 Computer Use 状态与系统权限管理。
 */
import { systemPreferences, shell } from "electron"
import { randomBytes } from "node:crypto"
import type { BuiltinToolsState } from "@enjoy-agents/ipc-contract"
import { getSetting, setSetting } from "../database"

const SETTING_KEY_BUILTIN_TOOLS = "builtin_tools_state"

interface PersistedBuiltinTools {
  builtinBrowserEnabled?: boolean
  browserBridgeEnabled?: boolean
  computerUseEnabled?: boolean
  screenVisualsEnabled?: boolean
  bridgePort?: number
  bridgeToken?: string
}

let inMemoryToken: string = ""
let bridgeConnectedClient: string | null = null

function readPersistedState(): PersistedBuiltinTools {
  try {
    const raw = getSetting(SETTING_KEY_BUILTIN_TOOLS)
    if (!raw) return {}
    return JSON.parse(raw) as PersistedBuiltinTools
  } catch {
    return {}
  }
}

function writePersistedState(state: PersistedBuiltinTools) {
  setSetting(SETTING_KEY_BUILTIN_TOOLS, JSON.stringify(state))
}

function getOrCreateToken(): string {
  if (inMemoryToken) return inMemoryToken
  const saved = readPersistedState()
  if (saved.bridgeToken) {
    inMemoryToken = saved.bridgeToken
  } else {
    inMemoryToken = randomBytes(16).toString("hex")
    writePersistedState({ ...saved, bridgeToken: inMemoryToken })
  }
  return inMemoryToken
}

export function checkDesktopPermissions(): { accessibility: boolean; screenCapture: boolean } {
  if (process.platform !== "darwin") {
    return { accessibility: true, screenCapture: true }
  }
  let accessibility = false
  let screenCapture = false
  try {
    accessibility =
      typeof systemPreferences.isTrustedAccessibilityClient === "function"
        ? systemPreferences.isTrustedAccessibilityClient(false)
        : false
  } catch {
    accessibility = false
  }
  try {
    screenCapture =
      typeof systemPreferences.getMediaAccessStatus === "function"
        ? systemPreferences.getMediaAccessStatus("screen") === "granted"
        : false
  } catch {
    screenCapture = false
  }
  return { accessibility, screenCapture }
}

export function openSystemPrivacySettings(type: "accessibility" | "screenCapture") {
  if (process.platform !== "darwin") return
  if (type === "accessibility") {
    void shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
    )
  } else {
    void shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
    )
  }
}

export function getBuiltinToolsState(): BuiltinToolsState {
  const saved = readPersistedState()
  const token = getOrCreateToken()
  const port = saved.bridgePort ?? 47823
  const permissions = checkDesktopPermissions()

  return {
    builtinBrowser: {
      enabled: saved.builtinBrowserEnabled ?? false
    },
    browserBridge: {
      enabled: saved.browserBridgeEnabled ?? false,
      port,
      pairingCode: `enjoy-bridge:${port}:${token}`,
      connectedBrowser: bridgeConnectedClient,
      extensionInstalled: Boolean(bridgeConnectedClient)
    },
    computerUse: {
      enabled: saved.computerUseEnabled ?? false,
      accessibilityGranted: permissions.accessibility,
      screenCaptureGranted: permissions.screenCapture,
      screenVisuals: saved.screenVisualsEnabled ?? true
    }
  }
}

export function setBuiltinToolEnabled(
  tool: "builtinBrowser" | "browserBridge" | "computerUse" | "screenVisuals",
  enabled: boolean
): BuiltinToolsState {
  const saved = readPersistedState()
  if (tool === "builtinBrowser") saved.builtinBrowserEnabled = enabled
  if (tool === "browserBridge") saved.browserBridgeEnabled = enabled
  if (tool === "computerUse") saved.computerUseEnabled = enabled
  if (tool === "screenVisuals") saved.screenVisualsEnabled = enabled
  writePersistedState(saved)
  return getBuiltinToolsState()
}

export function regenerateBridgePairingCode(): BuiltinToolsState {
  const saved = readPersistedState()
  inMemoryToken = randomBytes(16).toString("hex")
  saved.bridgeToken = inMemoryToken
  writePersistedState(saved)
  return getBuiltinToolsState()
}

export function updateBridgeClientConnection(clientInfo: string | null) {
  bridgeConnectedClient = clientInfo
}
