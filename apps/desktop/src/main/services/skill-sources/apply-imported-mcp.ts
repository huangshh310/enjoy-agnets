/**
 * 把可移植插件里的 MCP 行写入 #/mcp。默认不信任。
 */
import { disposeAllAcpSessions } from "@enjoy-agents/agent-harness"
import { upsertServer } from "../mcp-service.ts"
import type { ImportedMcpServer } from "./import-plugin.ts"

export function applyImportedMcp(servers: ImportedMcpServer[]): void {
  if (servers.length === 0) return
  for (const server of servers) {
    upsertServer({
      name: server.name,
      transport: server.transport,
      command: server.command,
      url: server.url,
      allowedResourceUris: [],
      modelVisibleTools: [],
      appOnlyTools: [],
      trusted: false
    })
  }
  disposeAllAcpSessions()
}
