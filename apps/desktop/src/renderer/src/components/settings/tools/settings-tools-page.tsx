/**
 * 设置 → 内置工具。只放内置浏览器和 Browser Bridge。
 * 电脑操控在 `#/settings/computer-use`，不在本页再放一套。
 */
import { useCallback, useEffect, useState } from "react"
import type { BuiltinToolsState } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { BrowserToolsCard } from "./browser-tools-card"

const DEFAULT_STATE: Pick<BuiltinToolsState, "builtinBrowser" | "browserBridge"> = {
  builtinBrowser: { enabled: false },
  browserBridge: {
    enabled: false,
    port: 47823,
    pairingCode: "",
    connectedBrowser: null,
    extensionInstalled: false
  }
}

export function SettingsToolsPage() {
  const [state, setState] = useState(DEFAULT_STATE)
  const [loading, setLoading] = useState(true)

  const loadState = useCallback(async () => {
    if (!hasIde()) return
    try {
      const data = await getIde().builtinTools.getState()
      setState({ builtinBrowser: data.builtinBrowser, browserBridge: data.browserBridge })
    } catch (err) {
      console.error("Failed to load builtin tools state", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadState()
  }, [loadState])

  const handleToggle = async (tool: "builtinBrowser" | "browserBridge", enabled: boolean) => {
    if (!hasIde()) return
    try {
      const next = await getIde().builtinTools.toggle({ tool, enabled })
      setState({ builtinBrowser: next.builtinBrowser, browserBridge: next.browserBridge })
    } catch (err) {
      console.error("Failed to toggle builtin tool", err)
    }
  }

  const handleRegenerateCode = async () => {
    if (!hasIde()) return
    try {
      const next = await getIde().builtinTools.regeneratePairingCode()
      setState({ builtinBrowser: next.builtinBrowser, browserBridge: next.browserBridge })
    } catch (err) {
      console.error("Failed to regenerate pairing code", err)
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
    <BrowserToolsCard
      browser={state.builtinBrowser}
      bridge={state.browserBridge}
      onToggleBrowser={(val) => handleToggle("builtinBrowser", val)}
      onToggleBridge={(val) => handleToggle("browserBridge", val)}
      onRegenerateCode={handleRegenerateCode}
    />
  )
}
