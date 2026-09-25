/**
 * 内置工具 (Builtin Tools) 状态与持久化：
 * 包含内置浏览器、Browser Bridge 与桌面 Computer Use 状态与系统权限管理。
 */
import { systemPreferences, shell } from "electron"
import { randomBytes } from "node:crypto"
import {
  conversationHasAnyDesktop,
  setConversationAnyDesktop
} from "@enjoy-agents/agent-core"
import type { BuiltinToolsState } from "@enjoy-agents/ipc-contract"
import { readDesktopAlwaysAllowAppKeys, revokeDesktopAlwaysAllowFromPrefs } from "../desktop-always-allow-prefs"
import { getSetting, setSetting } from "../database"
import { syncActiveRunsDesktopAllow } from "../conversation-desktop-allow-sync"
import { persistableBuiltinTools, type PersistedBuiltinTools } from "./persist-builtin-tools"
import { displaySession } from "./computer-use/display-session"
import { resolveExecutorCommand, spawnTargetPath } from "./computer-use/executor-command"
import {
  evaluateHelperIdentity,
  inspectDarwinCodesign,
  readHelperSidecar,
  resolveExpectedIdentity
} from "./computer-use/executor-identity"

const SETTING_KEY_BUILTIN_TOOLS = "builtin_tools_state"

let inMemoryToken: string = ""
let bridgeConnectedClient: string | null = null

function readPersistedState(): PersistedBuiltinTools {
  try {
    const raw = getSetting(SETTING_KEY_BUILTIN_TOOLS)
    if (!raw) return {}
    return persistableBuiltinTools(JSON.parse(raw) as Record<string, unknown>)
  } catch {
    return {}
  }
}

function writePersistedState(state: PersistedBuiltinTools) {
  setSetting(SETTING_KEY_BUILTIN_TOOLS, JSON.stringify(persistableBuiltinTools(state)))
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
  const host = checkHostDesktopPermissions()
  if (process.platform !== "darwin") return host
  // 未签名 / 错位 helper 不得把宿主 AX 显示成「已授权可点」。
  return {
    accessibility: host.accessibility && peekHelperIdentityReady(),
    screenCapture: host.screenCapture
  }
}

/** 只 peek 已有二进制，禁止 getState 触发 swiftc。 */
function peekHelperIdentityReady(): boolean {
  const command = resolveExecutorCommand(process.platform, process.resourcesPath, process.arch, { compile: false })
  const spawnPath = command ? spawnTargetPath(command, process.platform) : null
  const sidecar = spawnPath ? readHelperSidecar(spawnPath) : null
  return evaluateHelperIdentity({
    platform: process.platform,
    spawnPath,
    codesign: spawnPath ? inspectDarwinCodesign(spawnPath) : null,
    sidecar,
    expectedIdentity: resolveExpectedIdentity(process.env, sidecar)
  }).ready
}

function checkHostDesktopPermissions(): { accessibility: boolean; screenCapture: boolean } {
  if (process.platform !== "darwin") {
    return { accessibility: true, screenCapture: true }
  }
  return {
    accessibility: readHostAccessibility(),
    screenCapture: readHostScreenCapture()
  }
}

function readHostAccessibility(): boolean {
  try {
    return typeof systemPreferences.isTrustedAccessibilityClient === "function"
      ? systemPreferences.isTrustedAccessibilityClient(false)
      : false
  } catch {
    return false
  }
}

function readHostScreenCapture(): boolean {
  try {
    return typeof systemPreferences.getMediaAccessStatus === "function"
      ? systemPreferences.getMediaAccessStatus("screen") === "granted"
      : false
  } catch {
    return false
  }
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

export function getBuiltinToolsState(sessionId?: string): BuiltinToolsState {
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
      screenVisuals: saved.screenVisualsEnabled ?? true,
      anyDesktopSession: sessionId ? conversationHasAnyDesktop(sessionId) : false,
      alwaysAllowAppKeys: readDesktopAlwaysAllowAppKeys(),
      session: displaySession()
    }
  }
}

/** 设置撤销：只清持久簿，不清会话表 / anyDesktop。 */
export function revokeAlwaysAllowApp(appKey: string, sessionId?: string): BuiltinToolsState {
  revokeDesktopAlwaysAllowFromPrefs(appKey)
  return getBuiltinToolsState(sessionId)
}

export function setBuiltinToolEnabled(
  tool: "builtinBrowser" | "browserBridge" | "computerUse" | "screenVisuals" | "anyDesktopSession",
  enabled: boolean,
  sessionId?: string
): BuiltinToolsState {
  if (tool === "anyDesktopSession") {
    if (sessionId?.trim()) {
      setConversationAnyDesktop(sessionId, enabled)
      syncActiveRunsDesktopAllow(sessionId)
    }
    return getBuiltinToolsState(sessionId)
  }
  const saved = readPersistedState()
  if (tool === "builtinBrowser") saved.builtinBrowserEnabled = enabled
  if (tool === "browserBridge") saved.browserBridgeEnabled = enabled
  if (tool === "computerUse") saved.computerUseEnabled = enabled
  if (tool === "screenVisuals") saved.screenVisualsEnabled = enabled
  writePersistedState(saved)
  return getBuiltinToolsState(sessionId)
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
