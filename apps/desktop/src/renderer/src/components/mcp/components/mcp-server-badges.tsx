/**
 * MCP 卡片状态章：协议 / 连接 / 信任。
 */
import { RiCheckLine, RiCloseLine, RiLoader4Line } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function TransportBadge({ transport }: { transport: McpServer["transport"] }) {
  return (
    <span
      className={cx(
        "rounded px-1.5 py-0.5 font-mono text-caption-2-medium uppercase",
        transport === "stdio"
          ? "bg-accent-500/10 text-accent-500"
          : transport === "sse"
            ? "bg-state-success-text/10 text-state-success-text"
            : "bg-status-yellow-background/10 text-status-yellow-text"
      )}
    >
      {transport}
    </span>
  )
}

export function ConnectionBadge({
  connected,
  isConnecting
}: {
  connected: boolean
  isConnecting?: boolean
}) {
  const t = useT()
  if (isConnecting) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-accent-500/10 px-1.5 py-0.5 text-caption-2-medium text-accent-500">
        <RiLoader4Line className="size-2.5 animate-spin" />
        {t("pages.mcp.connecting")}
      </span>
    )
  }
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-caption-2-medium",
        connected
          ? "bg-state-success-text/10 text-state-success-text"
          : "bg-background-secondary-default text-text-tertiary"
      )}
    >
      <span className={cx("size-1.5 rounded-full", connected ? "bg-state-success-base" : "bg-text-tertiary")} />
      {connected ? t("pages.mcp.connected") : t("pages.mcp.disconnected")}
    </span>
  )
}

export function TrustBadge({ trusted }: { trusted: boolean }) {
  const t = useT()
  return (
    <span
      className={cx(
        "inline-flex select-none items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-caption-2-medium shadow-2xs",
        trusted
          ? "border-state-success-text/40 bg-state-success-text/10 text-state-success-text"
          : "border-dashed border-status-yellow-text/50 bg-status-yellow-background/10 text-status-yellow-text"
      )}
    >
      {trusted ? <RiCheckLine className="size-2.5" /> : <RiCloseLine className="size-2.5" />}
      <span>{trusted ? t("pages.mcp.trusted") : t("pages.mcp.untrusted")}</span>
    </span>
  )
}
