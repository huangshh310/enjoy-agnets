/**
 * 远程工作区顶条：连接中 / 已连接 / 失败 / 断开。远程 ≠ 引擎。
 */
import { Button } from "@/components/ui/button"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"

export function RemoteStatusStrip() {
  const t = useT()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const kind = useChatStore((state) => state.workspaceKind)
  const status = useChatStore((state) => state.remoteStatus)
  const label = useChatStore((state) => state.remoteLabel)
  if (kind !== "ssh" || !workspaceId) return null
  const text =
    status === "connected"
      ? t("settings.workspace.sshConnected")
      : status === "connecting"
        ? t("settings.workspace.sshConnecting")
        : status === "failed"
          ? t("settings.workspace.sshFailed")
          : t("settings.workspace.sshDisconnected")
  const connecting = status === "connecting"
  return (
    <div className="flex items-center justify-between gap-2 border-b border-separator-border bg-background-secondary-default px-3 py-1.5 text-caption-2-medium text-text-secondary">
      <span>
        {text}
        {label ? ` · ${label}` : ""}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-text-tertiary">{t("settings.workspace.remoteNotEngine")}</span>
        <Button size="sm" variant="outline" type="button" disabled={connecting || !hasIde()} onClick={() => void getIde().workspace.retry({ workspaceId })}>
          {t("settings.workspace.sshRetry")}
        </Button>
        <Button size="sm" variant="outline" type="button" disabled={connecting || !hasIde()} onClick={() => void getIde().workspace.disconnect({ workspaceId })}>
          {t("settings.workspace.sshDisconnect")}
        </Button>
      </div>
    </div>
  )
}
