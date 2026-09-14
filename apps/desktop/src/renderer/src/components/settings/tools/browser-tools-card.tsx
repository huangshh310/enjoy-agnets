/**
 * 内置工具设置 - 浏览器部分：
 * 包含内置浏览器与 Browser Bridge 独立卡片，严格匹配参考设计规范。
 */
import { useState } from "react"
import type { BuiltinBrowserState, BrowserBridgeState } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"

export function BrowserToolsCard({
  browser,
  bridge,
  onToggleBrowser,
  onToggleBridge,
  onRegenerateCode
}: {
  browser: BuiltinBrowserState
  bridge: BrowserBridgeState
  onToggleBrowser: (enabled: boolean) => void
  onToggleBridge: (enabled: boolean) => void
  onRegenerateCode: () => void
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    if (!bridge.pairingCode) return
    try {
      await navigator.clipboard.writeText(bridge.pairingCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard write failure fallback
    }
  }

  const handleOpenStore = () => {
    window.open("https://chromewebstore.google.com", "_blank")
  }

  const handleRevealDir = async () => {
    if (hasIde()) {
      await getIde().builtinTools.revealExtensionDir()
    }
  }

  const isConnected = Boolean(bridge.connectedBrowser)

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-body-medium font-semibold text-text-primary">
        {t("settings.builtinTools.browserSection")}
      </h3>

      {/* 内置浏览器独立卡片 */}
      <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-5">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-body-medium text-text-primary">
              {t("settings.builtinTools.builtinBrowserTitle")}
            </p>
            <p className="mt-1 text-caption-1-medium text-text-secondary">
              {t("settings.builtinTools.builtinBrowserDesc")}
            </p>
          </div>
          <Switch
            checked={browser.enabled}
            onCheckedChange={onToggleBrowser}
            aria-label={t("settings.builtinTools.builtinBrowserTitle")}
          />
        </div>
      </div>

      {/* Browser Bridge 独立卡片 */}
      <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-5">
        <div className="flex flex-col gap-4">
          {/* 顶部开关行 */}
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-body-medium text-text-primary">
                {t("settings.builtinTools.browserBridgeTitle")}
              </p>
              <p className="mt-1 text-caption-1-medium text-text-secondary">
                {t("settings.builtinTools.browserBridgeDesc")}
              </p>
            </div>
            <Switch
              checked={bridge.enabled}
              onCheckedChange={onToggleBridge}
              aria-label={t("settings.builtinTools.browserBridgeTitle")}
            />
          </div>

          {/* 开启后展开的配置信息 */}
          {bridge.enabled ? (
            <div className="flex flex-col gap-4 pt-1">
              {/* 连接状态行 */}
              <div className="text-body-medium font-medium text-text-primary">
                {isConnected ? (
                  <span>
                    {t("settings.builtinTools.statusConnectedPrefix")}
                    {bridge.connectedBrowser ?? "Chrome 0.1.0"}
                  </span>
                ) : (
                  <span className="font-normal text-text-secondary">
                    {t("settings.builtinTools.statusWaiting")}
                  </span>
                )}
              </div>

              {/* 配对码行 */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-body-medium text-text-primary shrink-0">
                  {t("settings.builtinTools.pairingCode")}
                </span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-caption-1-medium text-text-secondary select-all truncate max-w-sm">
                    {bridge.pairingCode}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-8 rounded-lg px-3 text-caption-1-medium"
                  >
                    {copied ? t("settings.builtinTools.copied") : t("settings.builtinTools.copy")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRegenerateCode}
                    className="h-8 rounded-lg px-3 text-caption-1-medium text-text-secondary hover:text-text-primary"
                  >
                    {t("settings.builtinTools.regenerate")}
                  </Button>
                </div>
              </div>

              {/* 扩展安装与本地加载按钮 */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenStore}
                  className="h-8 rounded-lg px-3 text-caption-1-medium"
                >
                  {t("settings.builtinTools.installFromChromeStore")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevealDir}
                  className="h-8 rounded-lg px-3 text-caption-1-medium text-text-secondary hover:text-text-primary"
                >
                  {t("settings.builtinTools.openExtensionFolder")}
                </Button>
              </div>

              {/* 底部使用提示 */}
              <p className="text-caption-1-medium text-text-tertiary leading-relaxed pt-1">
                {t("settings.builtinTools.bridgeTip")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
