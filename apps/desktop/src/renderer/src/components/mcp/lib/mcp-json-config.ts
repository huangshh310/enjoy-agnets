/**
 * Claude Desktop / Cursor 风格 mcpServers JSON 的序列化与解析。
 */
import type { McpServer, McpTransport } from "@enjoy-agents/ipc-contract"

export type McpJsonServerConfig = {
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  transport?: McpTransport
}

export type McpJsonUpsert = {
  name: string
  transport: McpTransport
  command?: string
  url?: string
  envRef?: string
}

/** 把当前已注册 Server 列表写成标准 mcpServers JSON。 */
export function buildMcpConfigJson(serverList: McpServer[]): string {
  const mcpServers: Record<string, unknown> = {}
  for (const server of serverList) {
    if (server.transport === "stdio") {
      const parts = (server.command ?? "").split(" ").filter(Boolean)
      const cmd = parts[0] || "npx"
      const args = parts.slice(1)
      let env: Record<string, string> | undefined
      if (server.envRef) {
        try {
          env = JSON.parse(server.envRef) as Record<string, string>
        } catch {
          // ignore malformed envRef
        }
      }
      mcpServers[server.name] = {
        command: cmd,
        args,
        ...(env ? { env } : {})
      }
    } else {
      mcpServers[server.name] = {
        url: server.url,
        transport: server.transport
      }
    }
  }
  return JSON.stringify({ mcpServers }, null, 2)
}

/** 解析 mcpServers JSON；缺 mcpServers 键时把根对象当映射。 */
export function parseMcpServersJson(raw: string): McpJsonUpsert[] {
  const parsed = JSON.parse(raw) as {
    mcpServers?: Record<string, McpJsonServerConfig>
  } & Record<string, McpJsonServerConfig>
  const serversObj = parsed.mcpServers ?? parsed
  const result: McpJsonUpsert[] = []

  for (const [name, config] of Object.entries(serversObj)) {
    if (!config || typeof config !== "object") continue
    const hasUrl = Boolean(config.url)
    const transport: McpTransport = hasUrl ? (config.transport ?? "sse") : "stdio"
    let command: string | undefined
    if (transport === "stdio") {
      const rawCmd = config.command ?? "npx"
      const rawArgs = config.args ?? []
      command = [rawCmd, ...rawArgs].join(" ")
    }
    const envRef = config.env ? JSON.stringify(config.env) : undefined
    result.push({
      name,
      transport,
      command,
      url: config.url,
      envRef
    })
  }

  return result
}
