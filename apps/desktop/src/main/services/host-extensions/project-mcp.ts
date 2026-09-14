/**
 * Enjoy #/mcp → ACP session/new mcpServers。未信任 / deny / 解析失败的丢掉。
 * 本机 stdio 解析成绝对路径；SSH 用远端 `command -v`，禁止把本机 abs 塞给远端 CLI。
 */
import type { AcpMcpServer } from "@enjoy-agents/agent-harness/acp-mcp"
import { listHostMcpCandidates } from "../mcp-service.ts"
import { projectStdioCommand } from "./project-stdio.ts"

export async function projectHostMcp(input: {
  enabled: boolean
  ssh: boolean
  lookupRemoteBin?: (bin: string) => Promise<string | undefined>
}): Promise<AcpMcpServer[]> {
  if (!input.enabled) return []
  const servers: AcpMcpServer[] = []
  for (const row of listHostMcpCandidates()) {
    if (!row.trusted || row.denied) continue
    const mapped = await mapRow(row, input)
    if (mapped) servers.push(mapped)
  }
  return servers
}

async function mapRow(
  row: ReturnType<typeof listHostMcpCandidates>[number],
  input: { ssh: boolean; lookupRemoteBin?: (bin: string) => Promise<string | undefined> }
): Promise<AcpMcpServer | undefined> {
  if (row.transport === "stdio") {
    if (!row.command) return undefined
    const resolved = await projectStdioCommand(row.command, input)
    if (!resolved) return undefined
    return {
      name: row.name,
      command: resolved.command,
      args: resolved.args,
      env: envVars(row.env)
    }
  }
  if (!row.url) return undefined
  return {
    type: row.transport,
    name: row.name,
    url: row.url
  }
}

function envVars(env?: Record<string, string>): Array<{ name: string; value: string }> | undefined {
  if (!env) return undefined
  const rows = Object.entries(env).map(([name, value]) => ({ name, value }))
  return rows.length > 0 ? rows : undefined
}
