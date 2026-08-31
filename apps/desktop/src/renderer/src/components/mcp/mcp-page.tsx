/**
 * MCP Server 与已批准 App。新 Server 默认不信任；iframe 消息只交给 main。
 */
import { useCallback, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiPlugLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { McpAppFrame } from "@renderer/components/mcp/mcp-app-frame"
import { McpServerRow } from "@renderer/components/mcp/mcp-server-row"
import { getIde, hasIde } from "@renderer/lib/ide"

export function McpPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState("local-server")
  const [command, setCommand] = useState("npx -y @modelcontextprotocol/server-everything")
  const [url, setUrl] = useState("")
  const [transport, setTransport] = useState<"stdio" | "sse" | "http">("stdio")
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
        label: "Servers",
        items: [{ id: "all", label: "Configured", icon: RiPlugLine, meta: String(servers.length) }]
      }
    ],
    [servers.length]
  )

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["mcp"] })
  }

  async function add() {
    await getIde().mcp.upsert({
      name,
      transport,
      command: transport === "stdio" ? command : undefined,
      url: transport === "stdio" ? undefined : url,
      allowedResourceUris: [],
      modelVisibleTools: [],
      appOnlyTools: [],
      trusted: false
    })
    await refresh()
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
    <SecondaryPageShell groups={groups} selectedId="all" onSelect={() => undefined} contentWidth="wide">
      <div className="flex flex-col gap-6">
        <div>
          <h1 data-testid="page-mcp" className="text-title-3-semibold text-text-primary">
            MCP
          </h1>
          <p className="mt-1 text-body-medium text-text-secondary">
            Servers start untrusted. Tools stay in main; Apps render in an isolated iframe.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
          <div className="flex gap-2">
            {(["stdio", "sse", "http"] as const).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={transport === item ? "default" : "outline"}
                onClick={() => setTransport(item)}
              >
                {item}
              </Button>
            ))}
          </div>
          {transport === "stdio" ? (
            <Input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="stdio command" />
          ) : (
            <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://mcp.example/sse" />
          )}
          <Button size="sm" data-testid="mcp-add-server" onClick={() => void add()}>
            Add server
          </Button>
        </div>
        <ul className="divide-y divide-separator-border rounded-2xl border border-border-button-default">
          {servers.map((server) => (
            <McpServerRow key={server.id} server={server} onChanged={refresh} onOpenApp={openApp} />
          ))}
          {servers.length === 0 ? (
            <li className="px-4 py-6 text-body-medium text-text-secondary">No MCP servers.</li>
          ) : null}
        </ul>
        {appSrcDoc ? (
          <div className="flex flex-col gap-2">
            <McpAppFrame srcDoc={appSrcDoc} title={appTitle} onAppMessage={onAppMessage} />
            {lastLog ? (
              <p data-testid="mcp-app-log-text" className="text-caption-1-medium text-text-secondary">
                {lastLog}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-body-medium text-text-secondary">
            Trusted servers can open an approved App. iframe messages are sanitized in main.
          </p>
        )}
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
