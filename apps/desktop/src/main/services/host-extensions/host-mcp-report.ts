/**
 * #/mcp 已启用行（信任且未 deny）投影报告：注入名 + 跳过原因。
 * 单服失败不打挂整场。
 */
import type { AcpMcpServer } from "@enjoy-agents/agent-harness/acp-mcp"
import type { HostInjectSkip } from "@enjoy-agents/ipc-contract/host-inject"
import { listHostMcpCandidates } from "../mcp-service.ts"
import { projectStdioCommand } from "./project-stdio.ts"

export type HostMcpReport = {
  servers: AcpMcpServer[]
  enabled: string[]
  injected: string[]
  skipped: HostInjectSkip[]
}

export async function reportHostMcp(input: {
  enabled: boolean
  ssh: boolean
  lookupRemoteBin?: (bin: string) => Promise<string | undefined>
}): Promise<HostMcpReport> {
  const enabledRows = listHostMcpCandidates().filter((row) => row.trusted && !row.denied)
  const enabled = uniqueNames(enabledRows.map((row) => row.name))
  if (!input.enabled) {
    return {
      servers: [],
      enabled,
      injected: [],
      skipped: enabled.map((name) => ({ name, reason: "unsupported" }))
    }
  }
  const servers: AcpMcpServer[] = []
  const injected: string[] = []
  const skipped: HostInjectSkip[] = []
  for (const row of enabledRows) {
    const mapped = await mapRow(row, input)
    if (!mapped) {
      skipped.push({ name: row.name.trim() || row.id, reason: "unresolved" })
      continue
    }
    servers.push(mapped)
    injected.push(mapped.name)
  }
  return { servers, enabled, injected: uniqueNames(injected), skipped }
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
