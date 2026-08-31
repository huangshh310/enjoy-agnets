/**
 * 单台 MCP Server 的 Bento 卡片：Trust / Connect / Tools 发现 / Open App / Remove。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiCommandLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiGlobalLine,
  RiInformationLine,
  RiLoader4Line,
  RiPlugLine,
  RiPulseLine,
  RiShieldCheckLine,
  RiShieldLine,
  RiTerminalBoxLine,
  RiToolsLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"

export function McpServerRow(props: {
  server: McpServer
  onChanged: () => Promise<void>
  onOpenApp: (serverId: string) => Promise<void>
}) {
  const server = props.server
  const [copied, setCopied] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  function handleCopy(text: string) {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleTest() {
    setIsTesting(true)
    setTestResult(null)
    try {
      await getIde().mcp.test(server.id)
      setTestResult("Ping OK")
    } catch (err: unknown) {
      setTestResult(err instanceof Error ? err.message : "Test failed")
    } finally {
      setIsTesting(false)
      setTimeout(() => setTestResult(null), 3000)
    }
  }

  const endpointText = server.transport === "stdio" ? server.command : server.url

  return (
    <article
      className={cx(
        "group relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all shadow-xs",
        server.connected
          ? "border-border-button-default bg-background-primary-default hover:border-accent-500/40 hover:shadow-md"
          : "border-border-button-default/60 bg-background-secondary-default/40 opacity-85"
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-separator-border/60 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cx(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-xs",
              server.connected
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border-button-default bg-background-secondary-default text-text-tertiary"
            )}
          >
            {server.transport === "stdio" ? (
              <RiTerminalBoxLine className="size-4.5" />
            ) : (
              <RiGlobalLine className="size-4.5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="truncate text-body-medium font-semibold text-text-primary">
                {server.name}
              </h4>
              <TransportBadge transport={server.transport} />
              <ConnectionBadge connected={server.connected} />
              <TrustBadge trusted={server.trusted} />
            </div>
            <span className="text-[11px] font-mono text-text-tertiary">
              ID: {server.id.slice(0, 14)}...
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
          <Button
            size="sm"
            variant={server.trusted ? "outline" : "default"}
            className="gap-1 h-8 text-caption-2-medium"
            onClick={() =>
              void getIde()
                .mcp.upsert({
                  id: server.id,
                  name: server.name,
                  transport: server.transport,
                  command: server.command,
                  url: server.url,
                  allowedResourceUris: server.allowedResourceUris,
                  modelVisibleTools: server.modelVisibleTools,
                  appOnlyTools: server.appOnlyTools,
                  trusted: !server.trusted
                })
                .then(() => props.onChanged())
            }
          >
            {server.trusted ? (
              <>
                <RiShieldLine className="size-3.5 text-text-tertiary" />
                <span>Untrust</span>
              </>
            ) : (
              <>
                <RiShieldCheckLine className="size-3.5 text-emerald-400" />
                <span>Trust server</span>
              </>
            )}
          </Button>

          {server.trusted ? (
            <Button
              size="sm"
              variant="outline"
              data-testid="mcp-open-app"
              className="gap-1 h-8 text-caption-2-medium text-accent-600 dark:text-accent-400"
              onClick={() => void props.onOpenApp(server.id)}
            >
              <RiExternalLinkLine className="size-3.5" />
              <span>Open App</span>
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-8 text-caption-2-medium"
            onClick={() =>
              void getIde()
                .mcp[server.connected ? "disconnect" : "connect"](server.id)
                .then(() => props.onChanged())
            }
          >
            <RiPlugLine className="size-3.5" />
            <span>{server.connected ? "Disconnect" : "Connect"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isTesting}
            className="gap-1 h-8 text-caption-2-medium"
            onClick={() => void handleTest()}
          >
            {isTesting ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiPulseLine className="size-3.5" />
            )}
            <span>{testResult || "Ping"}</span>
          </Button>

          <Button
            size="icon-sm"
            variant="ghost"
            title="Delete MCP server"
            className="size-8 text-text-tertiary hover:text-rose-500"
            onClick={() => void getIde().mcp.remove(server.id).then(() => props.onChanged())}
          >
            <RiDeleteBinLine className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Command / URL box */}
      {endpointText ? (
        <div className="mt-3 relative rounded-xl border border-separator-border/60 bg-background-secondary-default p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 font-mono text-[12px] text-text-secondary truncate">
            <RiCommandLine className="size-3.5 shrink-0 text-text-tertiary" />
            <span className="truncate">{endpointText}</span>
          </div>

          <button
            type="button"
            title="Copy command"
            onClick={() => handleCopy(endpointText)}
            className="inline-flex items-center rounded-md border border-border-button-default bg-background-primary-default p-1 text-text-tertiary hover:text-text-primary shadow-xs transition-colors shrink-0"
          >
            {copied ? (
              <RiCheckLine className="size-3 text-emerald-500" />
            ) : (
              <RiClipboardLine className="size-3" />
            )}
          </button>
        </div>
      ) : null}

      {/* Discovered Tools List */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-text-tertiary flex items-center gap-1">
            <RiToolsLine className="size-3" />
            <span>Discovered Tools ({server.tools?.length ?? 0})</span>
          </span>
        </div>

        {server.tools?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {server.tools.map((tool) => (
              <span
                key={tool.name}
                title={tool.description || tool.name}
                className="inline-flex items-center gap-1 rounded-md border border-border-button-default bg-background-secondary-default px-2 py-0.5 font-mono text-[11px] text-text-secondary hover:border-accent-500/40 hover:text-text-primary transition-colors cursor-default"
              >
                <span>{tool.name}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-text-tertiary italic">
            {server.connected
              ? "No tools exported by this server."
              : "Connect server to discover available tools."}
          </p>
        )}
      </div>
    </article>
  )
}

function TransportBadge({ transport }: { transport: McpServer["transport"] }) {
  return (
    <span className="rounded-md border border-border-button-default bg-background-secondary-default px-1.5 py-0.5 text-[10px] font-mono uppercase text-text-tertiary">
      {transport}
    </span>
  )
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Connected
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background-tertiary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
      <span className="size-1.5 rounded-full bg-text-tertiary" />
      Offline
    </span>
  )
}

function TrustBadge({ trusted }: { trusted: boolean }) {
  if (trusted) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[11px] font-medium text-accent-600 dark:text-accent-400">
        <RiShieldCheckLine className="size-3" />
        Trusted
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
      <RiInformationLine className="size-3" />
      Untrusted
    </span>
  )
}

