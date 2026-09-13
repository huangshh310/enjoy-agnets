/**
 * 远程工作区顶条：连接中 / 已连接 / 失败 / 断开。
 * 支持多远程主机切换与环境状态展示。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiFileCopyLine,
  RiFolderLine,
  RiInformationLine,
  RiLinkUnlinkM,
  RiRefreshLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { RemoteHostSwitcher } from "./remote-host-switcher"

import { parseRemoteLabel } from "./parse-remote-label"
export type { ParsedRemoteLabel } from "./parse-remote-label"
export { parseRemoteLabel } from "./parse-remote-label"

export function RemoteStatusStrip() {
  const t = useT()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const kind = useChatStore((state) => state.workspaceKind)
  const status = useChatStore((state) => state.remoteStatus)
  const label = useChatStore((state) => state.remoteLabel)
  const [copied, setCopied] = useState(false)

  if (kind !== "ssh" || !workspaceId) return null

  const connecting = status === "connecting"
  const isConnected = status === "connected"
  const isFailed = status === "failed"

  const { endpoint, path } = parseRemoteLabel(label)

  const handleCopyPath = async () => {
    if (!path) return
    try {
      await navigator.clipboard.writeText(path)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard write failure
    }
  }

  const statusDotClass = isConnected
    ? "bg-notification-success-foreground ring-notification-success-foreground/20"
    : connecting
      ? "bg-accent-500 animate-pulse ring-accent-500/20"
      : isFailed
        ? "bg-notification-error-foreground ring-notification-error-foreground/20"
        : "bg-text-tertiary ring-text-tertiary/20"

  const statusText = isConnected
    ? t("settings.workspace.sshConnected")
    : connecting
      ? t("settings.workspace.sshConnecting")
      : isFailed
        ? t("settings.workspace.sshFailed")
        : t("settings.workspace.sshDisconnected")

  const containerToneClass = isConnected
    ? "border-emerald-500/35 bg-gradient-to-r from-emerald-500/[0.10] via-teal-500/[0.06] to-accent-500/[0.08] dark:from-emerald-500/[0.15] dark:via-teal-500/[0.09] dark:to-accent-500/[0.12] dark:border-emerald-500/40 shadow-xs shadow-emerald-500/5"
    : connecting
      ? "border-accent-500/35 bg-accent-500/[0.08] dark:bg-accent-500/[0.12] dark:border-accent-500/40 animate-pulse"
      : isFailed
        ? "border-notification-error-foreground/35 bg-notification-error-foreground/[0.08] dark:bg-notification-error-foreground/[0.12]"
        : "border-border-button-default/60 bg-background-primary-default/90"

  return (
    <div
      className={`mb-2 flex h-10 shrink-0 items-center justify-between gap-3 rounded-2xl border px-3.5 py-1 text-caption-2-medium text-text-secondary select-none backdrop-blur-md transition-colors ${containerToneClass}`}
    >
      {/* 左侧：连接状态指示器 + 主机切换器 + 远端路径胶囊 */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* 状态徽标 */}
        <div
          className={`flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full border ${
            isConnected
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-background-secondary-default/80 border-separator-border text-text-secondary"
          }`}
        >
          <span className={`size-1.5 rounded-full ring-2 ${statusDotClass}`} />
          <span className="text-caption-2-medium font-medium">
            {statusText}
          </span>
        </div>

        {/* 远程主机下拉切换器 */}
        <RemoteHostSwitcher
          currentEndpoint={endpoint || label || "SSH Host"}
          currentStatus={status}
          currentWorkspaceId={workspaceId}
        />

        {/* 远端工作区路径胶囊 */}
        {path ? (
          <div
            className={`hidden md:flex items-center gap-1.5 min-w-0 max-w-sm rounded-lg border px-2.5 py-1 group transition-colors ${
              isConnected
                ? "border-emerald-500/25 bg-background-primary-default/85 text-text-secondary hover:border-emerald-500/50"
                : "border-border-button-default/60 bg-background-secondary-default/50 text-text-tertiary hover:border-border-button-default hover:text-text-secondary"
            }`}
            title={path}
          >
            <RiFolderLine className="size-3.5 shrink-0 text-text-tertiary group-hover:text-accent-600 transition-colors" />
            <span className="truncate font-mono text-caption-2-medium">
              {path}
            </span>
            <button
              type="button"
              onClick={() => void handleCopyPath()}
              className="ml-0.5 p-0.5 rounded hover:bg-background-tertiary-default text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              title={copied ? t("settings.workspace.remotePathCopied") : t("settings.workspace.remoteCopyPath")}
            >
              {copied ? (
                <RiCheckLine className="size-3 text-notification-success-foreground" />
              ) : (
                <RiFileCopyLine className="size-3" />
              )}
            </button>
          </div>
        ) : null}
      </div>

      {/* 右侧：架构说明微标 + 操作按钮 */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={`hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-caption-2-medium cursor-help transition-colors ${
            isConnected
              ? "border-accent-500/25 bg-accent-500/10 text-accent-700 dark:text-accent-300 hover:border-accent-500/40"
              : "border-border-button-default/60 bg-background-secondary-default/60 text-text-tertiary hover:text-text-secondary hover:border-border-button-default"
          }`}
          title={t("settings.workspace.remoteEnvTooltip")}
        >
          <RiInformationLine className="size-3 text-current shrink-0" />
          <span>{t("settings.workspace.remoteEnvBadge")}</span>
        </div>

        <Button
          size="sm"
          variant="outline"
          type="button"
          disabled={connecting || !hasIde()}
          onClick={() => void getIde().workspace.retry({ workspaceId })}
          className="h-7 px-2.5 gap-1 text-caption-2-medium bg-background-primary-default/90 hover:bg-background-primary-default"
        >
          <RiRefreshLine className={`size-3.5 ${connecting ? "animate-spin" : ""}`} />
          <span>{t("settings.workspace.sshRetry")}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          type="button"
          disabled={connecting || !hasIde()}
          onClick={() => void getIde().workspace.disconnect({ workspaceId })}
          className="h-7 px-2.5 gap-1 text-caption-2-medium bg-background-primary-default/90 text-notification-error-foreground hover:bg-notification-error-foreground/10 hover:border-notification-error-foreground/30 hover:text-notification-error-foreground"
        >
          <RiLinkUnlinkM className="size-3.5" />
          <span>{t("settings.workspace.sshDisconnect")}</span>
        </Button>
      </div>
    </div>
  )
}
