/**
 * MCP Server 与已批准 App。新 Server 默认不信任；iframe 消息只交给 main。
 */
import { useCallback, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiAddLine,
  RiCloseLine,
  RiCodeSSlashLine,
  RiCpuLine,
  RiDatabase2Line,
  RiExternalLinkLine,
  RiFolderLine,
  RiLoader4Line,
  RiPlugLine,
  RiSparklingLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cx } from "@/utils/cx"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { McpAppFrame } from "@renderer/components/mcp/mcp-app-frame"
import { McpServerRow } from "@renderer/components/mcp/mcp-server-row"
import { getIde, hasIde } from "@renderer/lib/ide"

const FEATURED_MCP_PLUGINS = [
  {
    id: "filesystem",
    name: "Local Filesystem",
    category: "File & Storage",
    icon: RiFolderLine,
    colorClass: "bg-blue-500/10 text-blue-500",
    description: "Provide complete filesystem read, write, directory traversal and file inspection tools to the Agent loop.",
    transport: "stdio" as const,
    command: "npx -y @modelcontextprotocol/server-filesystem ."
  },
  {
    id: "everything",
    name: "Everything Suite",
    category: "Full Toolkit & Apps",
    icon: RiSparklingLine,
    colorClass: "bg-purple-500/10 text-purple-500",
    description: "Multi-purpose tools with demo resources, prompts, and sandboxed interactive UI apps.",
    transport: "stdio" as const,
    command: "npx -y @modelcontextprotocol/server-everything"
  },
  {
    id: "github",
    name: "GitHub Ecosystem",
    category: "DevOps & VCS",
    icon: RiCodeSSlashLine,
    colorClass: "bg-emerald-500/10 text-emerald-500",
    description: "Manage repository issues, pull requests, commits, and code searches directly via Agent commands.",
    transport: "stdio" as const,
    command: "npx -y @modelcontextprotocol/server-github"
  },
  {
    id: "postgres",
    name: "PostgreSQL Database",
    category: "Data & Query",
    icon: RiDatabase2Line,
    colorClass: "bg-amber-500/10 text-amber-500",
    description: "Inspect schema structures, tables, and execute read-only SQL queries on your PostgreSQL databases.",
    transport: "stdio" as const,
    command: "npx -y @modelcontextprotocol/server-postgres postgresql://localhost/mydb"
  }
]

export function McpPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState("local-server")
  const [command, setCommand] = useState("npx -y @modelcontextprotocol/server-everything")
  const [url, setUrl] = useState("")
  const [transport, setTransport] = useState<"stdio" | "sse" | "http">("stdio")
  const [isAdding, setIsAdding] = useState(false)
  const [openServerId, setOpenServerId] = useState<string | null>(null)
  const [appSrcDoc, setAppSrcDoc] = useState<string | null>(null)
  const [appTitle, setAppTitle] = useState("MCP App")
  const [lastLog, setLastLog] = useState<string | null>(null)

  const serversQuery = useQuery({
    queryKey: ["mcp"],
    enabled: hasIde(),
    queryFn: () => getIde().mcp.servers() as Promise<McpServer[]>
  })
  const servers = serversQuery.data ?? []

  const groups = useMemo(
    () => [
      {
        id: "servers",
        label: "MCP Protocol",
        items: [
          {
            id: "all",
            label: "Configured servers",
            icon: RiPlugLine,
            meta: String(servers.length)
          }
        ]
      }
    ],
    [servers.length]
  )

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["mcp"] })
  }

  async function add(overrideName?: string, overrideCommand?: string, overrideTransport?: "stdio" | "sse" | "http") {
    const finalName = overrideName ?? name
    const finalCommand = overrideCommand ?? command
    const finalTransport = overrideTransport ?? transport
    if (!finalName.trim() || isAdding) return
    setIsAdding(true)
    try {
      await getIde().mcp.upsert({
        name: finalName.trim(),
        transport: finalTransport,
        command: finalTransport === "stdio" ? finalCommand : undefined,
        url: finalTransport === "stdio" ? undefined : url,
        allowedResourceUris: [],
        modelVisibleTools: [],
        appOnlyTools: [],
        trusted: false
      })
      await refresh()
    } finally {
      setIsAdding(false)
    }
  }

  async function openApp(serverId: string) {
    const opened = (await getIde().mcp.openApp({ id: serverId })) as {
      srcDoc: string
      title?: string
    }
    setOpenServerId(serverId)
    setAppSrcDoc(opened.srcDoc)
    setAppTitle(opened.title ?? "MCP App")
    setLastLog(null)
  }

  const onAppMessage = useCallback(
    (raw: unknown) => {
      if (!openServerId) return
      void getIde()
        .mcp.appMessage({ id: openServerId, message: raw })
        .then((result) => {
          const text = textFrom(result)
          if (text) setLastLog(text)
        })
    },
    [openServerId]
  )

  return (
    <SecondaryPageShell
      searchPlaceholder="Filter servers..."
      groups={groups}
      selectedId="all"
      onSelect={() => undefined}
      contentWidth="wide"
    >
      <div className="flex flex-col gap-7">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs ring-1 ring-accent-500/20">
              <RiPlugLine className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 data-testid="page-mcp" className="text-title-3-semibold text-text-primary">
                  Model Context Protocol (MCP) & Plugins
                </h1>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Sandboxed Isolation
                </span>
              </div>
              <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                Connect external tools and sandboxed interactive UI Apps. Tools execute securely in main; Apps render inside isolated iframe containers.
              </p>
            </div>
          </div>
        </header>

        {/* Featured Plugin Store Showcase */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-5 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">
                <RiSparklingLine className="size-3.5" />
              </div>
              <h3 className="text-body-medium font-semibold text-text-primary">
                Featured Plugin Store · 常用精选插件
              </h3>
            </div>
            <span className="text-caption-2-medium text-text-tertiary">
              1-click setup & connect
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURED_MCP_PLUGINS.map((plugin) => {
              const Icon = plugin.icon
              const alreadyRegistered = servers.some((s) => s.name === plugin.id || s.name === plugin.name)
              return (
                <div
                  key={plugin.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4.5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={cx("flex size-9 shrink-0 items-center justify-center rounded-xl shadow-xs", plugin.colorClass)}>
                          <Icon className="size-4.5" />
                        </div>
                        <div>
                          <h4 className="text-caption-1-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                            {plugin.name}
                          </h4>
                          <span className="text-[10px] font-mono uppercase text-text-tertiary">
                            {plugin.category}
                          </span>
                        </div>
                      </div>

                      <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[10px] font-mono text-text-secondary">
                        {plugin.transport}
                      </span>
                    </div>

                    <p className="mt-2.5 text-[12px] text-text-secondary leading-relaxed">
                      {plugin.description}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
                    <span className="font-mono text-[10px] text-text-tertiary truncate max-w-[170px]">
                      {plugin.command}
                    </span>

                    <Button
                      size="sm"
                      variant={alreadyRegistered ? "outline" : "default"}
                      disabled={isAdding}
                      onClick={() => {
                        setName(plugin.id)
                        setCommand(plugin.command)
                        setTransport(plugin.transport)
                        if (!alreadyRegistered) {
                          void add(plugin.id, plugin.command, plugin.transport)
                        }
                      }}
                      className="gap-1 h-7 px-2.5 text-caption-2-medium shrink-0 shadow-xs"
                    >
                      <RiAddLine className="size-3" />
                      <span>{alreadyRegistered ? "Prefill Config" : "Connect Plugin"}</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Custom Server Configuration Card */}
        <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
                <RiCpuLine className="size-3.5" />
              </div>
              <h3 className="text-body-medium font-semibold text-text-primary">
                Custom MCP Server Configuration
              </h3>
            </div>

            {/* Transport selector */}
            <div className="flex items-center gap-1 rounded-xl bg-background-secondary-default p-1">
              {(["stdio", "sse", "http"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTransport(item)}
                  className={cx(
                    "rounded-lg px-2.5 py-1 text-caption-2-medium font-mono uppercase transition-all",
                    transport === item
                      ? "bg-background-primary-default text-text-primary shadow-xs font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3.5">
            <div className="grid gap-3 sm:grid-cols-[14rem_minmax(0,1fr)]">
              <div className="flex flex-col gap-1.5">
                <Label className="text-caption-1-medium text-text-secondary">Server Identifier</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. local-filesystem"
                  className="bg-background-secondary-default focus-visible:bg-background-primary-default font-mono text-[13px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-caption-1-medium text-text-secondary">
                  {transport === "stdio" ? "Command & Process Arguments" : "Endpoint URL"}
                </Label>
                {transport === "stdio" ? (
                  <Input
                    value={command}
                    onChange={(event) => setCommand(event.target.value)}
                    placeholder="npx -y @modelcontextprotocol/server-everything"
                    className="font-mono text-body-medium bg-background-secondary-default focus-visible:bg-background-primary-default"
                  />
                ) : (
                  <Input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://mcp.example.com/sse"
                    className="font-mono text-body-medium bg-background-secondary-default focus-visible:bg-background-primary-default"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-separator-border/40 text-caption-2-medium text-text-tertiary">
              <span>
                {transport === "stdio"
                  ? "Standard input/output binary process. Isolated and managed by Electron main."
                  : "Remote HTTP / Server-Sent Events MCP endpoint."}
              </span>

              <Button
                size="sm"
                data-testid="mcp-add-server"
                disabled={!name.trim() || isAdding}
                onClick={() => void add()}
                className="gap-1.5 shadow-xs shrink-0"
              >
                {isAdding ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiAddLine className="size-4" />
                )}
                <span>Register Server</span>
              </Button>
            </div>
          </div>
        </section>

        {/* Sandboxed App Window (if opened) */}
        {appSrcDoc ? (
          <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default shadow-md">
            <div className="flex items-center justify-between border-b border-separator-border/60 bg-background-secondary-default px-4 py-2.5">
              <div className="flex items-center gap-2">
                <RiExternalLinkLine className="size-4 text-accent-500" />
                <h4 className="text-body-medium font-semibold text-text-primary">{appTitle}</h4>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  Sandboxed (connect-src: none)
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  title="Close App"
                  onClick={() => {
                    setAppSrcDoc(null)
                    setOpenServerId(null)
                  }}
                >
                  <RiCloseLine className="size-4" />
                </Button>
              </div>
            </div>

            <div className="p-3">
              <McpAppFrame srcDoc={appSrcDoc} title={appTitle} onAppMessage={onAppMessage} />

              {lastLog ? (
                <div className="mt-2.5 rounded-xl border border-separator-border/60 bg-background-secondary-default p-2.5">
                  <p
                    data-testid="mcp-app-log-text"
                    className="font-mono text-caption-2-medium text-text-secondary"
                  >
                    Live IPC Echo: {lastLog}
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Configured Servers Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-body-medium font-semibold text-text-primary">
              Configured Servers ({servers.length})
            </h3>
          </div>

          {servers.length === 0 ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/50 px-6 py-8 text-center">
              <RiPlugLine className="size-8 text-text-tertiary" />
              <p className="mt-2 text-body-medium font-semibold text-text-primary">
                No MCP servers registered
              </p>
              <p className="mt-1 max-w-sm text-caption-1-medium text-text-secondary">
                Add an MCP server above to equip the Agent loop with custom external tools and sandboxed interactive Apps.
              </p>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {servers.map((server) => (
                <McpServerRow
                  key={server.id}
                  server={server}
                  onChanged={refresh}
                  onOpenApp={openApp}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </SecondaryPageShell>
  )
}

function textFrom(result: unknown): string | undefined {
  if (result && typeof result === "object" && "text" in result) {
    const text = (result as { text?: unknown }).text
    return typeof text === "string" ? text : undefined
  }
  return undefined
}

