/**
 * MCP Server 卡片行组件（兼容性包装）
 */
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { McpServerCard } from "./components/mcp-server-card"

export function McpServerRow(props: {
  server: McpServer
  onChanged: () => Promise<void>
  onOpenApp: (serverId: string) => Promise<void>
  onExploreTools?: (server: McpServer) => void
  onEdit?: (server: McpServer) => void
}) {
  return (
    <McpServerCard
      server={props.server}
      onChanged={props.onChanged}
      onOpenApp={props.onOpenApp}
      onExploreTools={props.onExploreTools ?? (() => undefined)}
      onEdit={props.onEdit ?? (() => undefined)}
    />
  )
}
