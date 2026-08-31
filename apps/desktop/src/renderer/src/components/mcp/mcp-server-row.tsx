/**
 * 单台 MCP Server 的 Trust / Connect / Open App / Remove。
 */
import { Button } from "@/components/ui/button"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"

export function McpServerRow(props: {
  server: McpServer
  onChanged: () => Promise<void>
  onOpenApp: (serverId: string) => Promise<void>
}) {
  const server = props.server

  return (
    <li className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-body-medium text-text-primary">{server.name}</p>
        <p className="text-caption-1-medium text-text-tertiary">
          {server.transport} · {server.trusted ? "trusted" : "untrusted"} ·{" "}
          {server.connected ? "connected" : "offline"}
          {server.tools?.length ? ` · ${server.tools.length} tools` : ""}
        </p>
        {server.tools?.length ? (
          <p className="text-caption-1-medium text-text-tertiary">
            {server.tools.map((tool) => tool.name).join(", ")}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
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
          {server.trusted ? "Untrust" : "Trust"}
        </Button>
        {server.trusted ? (
          <Button size="sm" data-testid="mcp-open-app" onClick={() => void props.onOpenApp(server.id)}>
            Open App
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void getIde()
              .mcp[server.connected ? "disconnect" : "connect"](server.id)
              .then(() => props.onChanged())
          }
        >
          {server.connected ? "Disconnect" : "Connect"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void getIde().mcp.test(server.id)}>
          Test
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void getIde().mcp.remove(server.id).then(() => props.onChanged())}
        >
          Remove
        </Button>
      </div>
    </li>
  )
}
