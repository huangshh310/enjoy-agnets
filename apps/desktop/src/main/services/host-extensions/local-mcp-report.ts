/**
 * Enjoy Local：已启用 MCP 以已连接可见工具为准注入 ToolLoop。
 * 信任但未 Connect 的记 not-connected，不假装已注入。
 */
import type { HostMcpReport } from "./host-mcp-report.ts"
import { listHostMcpCandidates, listVisibleMcpTools } from "../mcp-service.ts"

export function reportLocalHostMcp(): HostMcpReport {
  const enabledRows = listHostMcpCandidates().filter((row) => row.trusted && !row.denied)
  const enabled = uniqueNames(enabledRows.map((row) => row.name))
  const connected = new Set(
    listVisibleMcpTools()
      .filter((item) => item.trusted)
      .map((item) => item.serverName.trim())
  )
  const injected = enabled.filter((name) => connected.has(name))
  return {
    servers: [],
    enabled,
    injected,
    skipped: enabled
      .filter((name) => !connected.has(name))
      .map((name) => ({ name, reason: "not-connected" }))
  }
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of names) {
    const name = raw.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}
