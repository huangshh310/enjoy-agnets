/**
 * 设置中心 - 内置工具页面：
 * 聚合内置浏览器、Browser Bridge（Chrome 扩展）与桌面 Computer Use。
 */
import { useCallback, useEffect, useState } from "react"
import type { BuiltinToolsState } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { BrowserToolsCard } from "./browser-tools-card"
import { DesktopToolsCard } from "./desktop-tools-card"

const DEFAULT_STATE: BuiltinToolsState = {
  builtinBrowser: { enabled: false },
  browserBridge: {
    enabled: false,
    port: 47823,
    pairingCode: "",
    connectedBrowser: null,
    extensionInstalled: false
  },
  computerUse: {
    enabled: false,
    accessibilityGranted: false,
    screenCaptureGranted: false,
    screenVisuals: true,
    anyDesktopSession: false,
    alwaysAllowApps: []
  }
}

export function SettingsToolsPage() {
  const sessionId = useChatStore((store) => store.sessionId)
  const [state, setState] = useState<BuiltinToolsState>(DEFAULT_STATE)
  const [loading, setLoading] = useState(true)

  const loadState = useCallback(async () => {
    if (!hasIde()) return
    try {
      const data = await getIde().builtinTools.getState(sessionId ? { sessionId } : undefined)
      setState(data)
    } catch (err) {
      console.error("Failed to load builtin tools state", err)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  const refreshPermissions = useCallback(async () => {
    if (!hasIde()) return
    try {
      const perms = await getIde().builtinTools.getDesktopPermissions()
      setState((prev) => ({
        ...prev,
        computerUse: {
          ...prev.computerUse,
          accessibilityGranted: perms.accessibility,
          screenCaptureGranted: perms.screenCapture
        }
      }))
    } catch (err) {
      console.error("Failed to refresh permissions", err)
    }
  }, [])

  useEffect(() => {
    void loadState()
  }, [loadState])

  useEffect(() => {
    window.addEventListener("focus", refreshPermissions)
    return () => window.removeEventListener("focus", refreshPermissions)
  }, [refreshPermissions])

  const handleToggle = async (
    tool: "builtinBrowser" | "browserBridge" | "computerUse" | "screenVisuals" | "anyDesktopSession",
    enabled: boolean
  ) => {
    if (!hasIde()) return
    // anyDesktop 只写当前对话会话表；无焦点 sessionId 时 main 本就会 no-op，这里也不发 IPC。
    if (tool === "anyDesktopSession" && !sessionId?.trim()) return
    try {
      const next = await getIde().builtinTools.toggle({
        tool,
        enabled,
        sessionId: sessionId ?? undefined
      })
      setState(next)
    } catch (err) {
      console.error("Failed to toggle builtin tool", err)
    }
  }

  const handleRegenerateCode = async () => {
    if (!hasIde()) return
    try {
      const next = await getIde().builtinTools.regeneratePairingCode()
      setState(next)
    } catch (err) {
      console.error("Failed to regenerate pairing code", err)
    }
  }

  const handleRevokeAlwaysAllow = async (appKey: string) => {
    if (!hasIde() || !appKey.trim()) return
    try {
      const next = await getIde().builtinTools.revokeAlwaysAllow({
        appKey,
        sessionId: sessionId ?? undefined
      })
      setState(next)
    } catch (err) {
      console.error("Failed to revoke always-allow app", err)
    }
  }

  const handleOpenPermission = async (permission: "accessibility" | "screenCapture") => {
    if (!hasIde()) return
    try {
      await getIde().builtinTools.openSystemPermission({ permission })
    } catch (err) {
      console.error("Failed to open system permission", err)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-48 animate-pulse rounded-2xl border border-border-button-default bg-background-secondary-default" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BrowserToolsCard
        browser={state.builtinBrowser}
        bridge={state.browserBridge}
        onToggleBrowser={(val) => handleToggle("builtinBrowser", val)}
        onToggleBridge={(val) => handleToggle("browserBridge", val)}
        onRegenerateCode={handleRegenerateCode}
      />

      <DesktopToolsCard
        desktop={state.computerUse}
        sessionId={sessionId}
        onToggleComputerUse={(val) => handleToggle("computerUse", val)}
        onToggleScreenVisuals={(val) => handleToggle("screenVisuals", val)}
        onToggleAnyDesktop={(val) => handleToggle("anyDesktopSession", val)}
        onRevokeAlwaysAllow={(appKey) => void handleRevokeAlwaysAllow(appKey)}
        onOpenPermission={handleOpenPermission}
      />
    </div>
  )
}
