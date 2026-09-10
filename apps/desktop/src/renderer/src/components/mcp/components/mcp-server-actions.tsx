/**
 * MCP 卡片顶栏操作：信任、App、连接、Ping、编辑、删除。
 */
import {
  RiDeleteBinLine,
  RiEditLine,
  RiExternalLinkLine,
  RiLoader4Line,
  RiPlugLine,
  RiPulseLine,
  RiShieldCheckLine,
  RiShieldLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function McpServerActions({
  server,
  isConnecting,
  isTesting,
  testResult,
  onTrustClick,
  onOpenApp,
  onToggleConnect,
  onTest,
  onEdit,
  onDelete
}: {
  server: McpServer
  isConnecting: boolean
  isTesting: boolean
  testResult: string | null
  onTrustClick: () => void
  onOpenApp: () => void
  onToggleConnect: () => void
  onTest: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const t = useT()
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className={cx(
          "h-7 gap-1 px-2.5 text-caption-2-medium",
          server.trusted ? "text-text-secondary" : "text-text-primary"
        )}
        data-testid="mcp-trust"
        onClick={onTrustClick}
      >
        {server.trusted ? (
          <RiShieldLine className="size-3 text-text-tertiary" />
        ) : (
          <RiShieldCheckLine className="size-3 text-emerald-500" />
        )}
        <span>{server.trusted ? t("pages.mcp.untrust") : t("pages.mcp.trust")}</span>
      </Button>
      {server.trusted ? (
        <Button
          size="sm"
          variant="outline"
          data-testid="mcp-open-app"
          className="h-7 gap-1 px-2.5 text-caption-2-medium text-accent-500"
          onClick={onOpenApp}
        >
          <RiExternalLinkLine className="size-3" />
          <span>{t("pages.mcp.openApp")}</span>
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        disabled={isConnecting}
        className="h-7 gap-1 px-2.5 text-caption-2-medium"
        onClick={onToggleConnect}
      >
        {isConnecting ? (
          <RiLoader4Line className="size-3 animate-spin text-accent-500" />
        ) : (
          <RiPlugLine className="size-3" />
        )}
        <span>{server.connected ? t("pages.mcp.disconnect") : t("pages.mcp.connectAction")}</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={isTesting}
        className="h-7 gap-1 px-2 text-caption-2-medium text-text-secondary"
        onClick={onTest}
      >
        {isTesting ? <RiLoader4Line className="size-3 animate-spin" /> : <RiPulseLine className="size-3" />}
        <span>{testResult || t("pages.mcp.ping")}</span>
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        title={t("pages.mcp.editConfig")}
        className="size-7 text-text-tertiary hover:text-text-primary"
        onClick={onEdit}
      >
        <RiEditLine className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        title={t("pages.mcp.deleteServer")}
        className="size-7 text-text-tertiary hover:text-text-error-primary"
        onClick={onDelete}
      >
        <RiDeleteBinLine className="size-3.5" />
      </Button>
    </div>
  )
}
