/**
 * 单台 MCP Server 卡片：状态、信任声明、工具折叠。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiCommandLine,
  RiGlobalLine,
  RiInformationLine,
  RiKey2Line,
  RiTerminalBoxLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { useT, type TranslateFn } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { McpServerActions } from "./mcp-server-actions"
import { ConnectionBadge, TransportBadge, TrustBadge } from "./mcp-server-badges"
import { McpServerTools } from "./mcp-server-tools"
import { McpTrustConfirm } from "./mcp-trust-confirm"

export function McpServerCard(props: {
  server: McpServer
  onChanged: () => Promise<void>
  onOpenApp: (serverId: string) => Promise<void>
  onExploreTools: (server: McpServer) => void
  onEdit: (server: McpServer) => void
}) {
  const { server, onChanged, onOpenApp, onExploreTools, onEdit } = props
  const t = useT()
  const [isConfirmingTrust, setIsConfirmingTrust] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [isExpandingTools, setIsExpandingTools] = useState(false)
  const endpointText = server.transport === "stdio" ? server.command : server.url

  return (
    <article
      className={cx(
        "group relative flex flex-col justify-between rounded-xl border p-4 transition-all",
        server.connected
          ? "border-separator-border/80 bg-background-primary-default shadow-xs hover:border-separator-border"
          : "border-separator-border/50 bg-background-secondary-default/25 opacity-90"
      )}
    >
      <div className="flex flex-col gap-2.5 border-b border-separator-border/50 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <McpServerIdentity server={server} isConnecting={isConnecting} />
        <McpServerActions
          server={server}
          isConnecting={isConnecting}
          isTesting={isTesting}
          testResult={testResult}
          onTrustClick={() => {
            if (!server.trusted) setIsConfirmingTrust(true)
            else void toggleTrust(server, onChanged)
          }}
          onOpenApp={() => void onOpenApp(server.id)}
          onToggleConnect={() => void toggleConnect(server, setIsConnecting, onChanged)}
          onTest={() => void pingServer(server.id, t, setIsTesting, setTestResult)}
          onEdit={() => onEdit(server)}
          onDelete={() => void getIde().mcp.remove(server.id).then(() => onChanged())}
        />
      </div>
      {endpointText ? (
        <EndpointRow
          text={endpointText}
          copied={copied}
          onCopy={() => {
            void navigator.clipboard.writeText(endpointText).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
        />
      ) : null}
      {server.error ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-border-error-default/20 bg-background-tertiary-error/5 px-2.5 py-1 text-caption-2-regular text-text-error-primary">
          <RiInformationLine className="size-3.5 shrink-0" />
          <span className="truncate">{server.error}</span>
        </div>
      ) : null}
      {isConfirmingTrust ? (
        <McpTrustConfirm
          onCancel={() => setIsConfirmingTrust(false)}
          onConfirm={() => {
            setIsConfirmingTrust(false)
            void toggleTrust(server, onChanged)
          }}
        />
      ) : null}
      <McpServerTools
        server={server}
        expanded={isExpandingTools}
        onToggle={() => setIsExpandingTools((prev) => !prev)}
        onExplore={() => onExploreTools(server)}
      />
    </article>
  )
}

function McpServerIdentity({
  server,
  isConnecting
}: {
  server: McpServer
  isConnecting: boolean
}) {
  const t = useT()
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={cx(
          "flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs",
          server.connected
            ? "border-state-success-text/20 bg-state-success-text/10 text-state-success-text"
            : "border-separator-border bg-background-secondary-default text-text-tertiary"
        )}
      >
        {server.transport === "stdio" ? (
          <RiTerminalBoxLine className="size-4" />
        ) : (
          <RiGlobalLine className="size-4" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate text-body-medium font-semibold text-text-primary">{server.name}</h4>
          <TransportBadge transport={server.transport} />
          <ConnectionBadge connected={server.connected} isConnecting={isConnecting} />
          <TrustBadge trusted={server.trusted} />
        </div>
        <div className="flex items-center gap-2 font-mono text-caption-2-regular text-text-tertiary">
          <span>{server.id.slice(0, 14)}</span>
          {server.envRef ? (
            <span className="inline-flex items-center gap-1 text-text-secondary">
              <RiKey2Line className="size-3 text-status-yellow-text" />
              <span>{t("pages.mcp.envBadge")}</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function EndpointRow({
  text,
  copied,
  onCopy
}: {
  text: string
  copied: boolean
  onCopy: () => void
}) {
  const t = useT()
  return (
    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-separator-border/60 bg-background-secondary-default/50 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2 truncate font-mono text-caption-2-regular text-text-secondary">
        <RiCommandLine className="size-3 shrink-0 text-text-tertiary" />
        <span className="truncate">{text}</span>
      </div>
      <button
        type="button"
        title={t("pages.mcp.copyEndpoint")}
        onClick={onCopy}
        className="inline-flex shrink-0 items-center rounded p-1 text-text-tertiary hover:text-text-primary"
      >
        {copied ? <RiCheckLine className="size-3 text-state-success-text" /> : <RiClipboardLine className="size-3" />}
      </button>
    </div>
  )
}

async function toggleConnect(
  server: McpServer,
  setConnecting: (value: boolean) => void,
  onChanged: () => Promise<void>
) {
  setConnecting(true)
  try {
    if (server.connected) await getIde().mcp.disconnect(server.id)
    else await getIde().mcp.connect(server.id)
    await onChanged()
  } catch {
    // 保持当前状态
  } finally {
    setConnecting(false)
  }
}

async function toggleTrust(server: McpServer, onChanged: () => Promise<void>) {
  await getIde().mcp.upsert({
    id: server.id,
    name: server.name,
    transport: server.transport,
    command: server.command,
    url: server.url,
    envRef: server.envRef,
    allowedResourceUris: server.allowedResourceUris,
    modelVisibleTools: server.modelVisibleTools,
    appOnlyTools: server.appOnlyTools,
    trusted: !server.trusted
  })
  await onChanged()
}

async function pingServer(
  id: string,
  t: TranslateFn,
  setTesting: (value: boolean) => void,
  setResult: (value: string | null) => void
) {
  setTesting(true)
  setResult(null)
  try {
    const res = (await getIde().mcp.test(id)) as { ok: boolean; message?: string }
    setResult(res.ok ? t("pages.mcp.pingOk") : (res.message ?? t("pages.mcp.pingFailed")))
  } catch (err: unknown) {
    setResult(err instanceof Error ? err.message : t("pages.mcp.testFailed"))
  } finally {
    setTesting(false)
    setTimeout(() => setResult(null), 3500)
  }
}
