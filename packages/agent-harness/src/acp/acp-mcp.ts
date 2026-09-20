/**
 * ACP session/new 的 MCP 声明。stdio command 必须是绝对路径。
 */
import { parseAcpSessionCaps } from "./acp-session-caps.ts"
export type AcpMcpEnvVar = { name: string; value: string }

export type AcpMcpStdioServer = {
  name: string
  command: string
  args: string[]
  env?: AcpMcpEnvVar[]
}

export type AcpMcpHttpServer = {
  type: "http" | "sse"
  name: string
  url: string
  headers?: AcpMcpEnvVar[]
}

export type AcpMcpServer = AcpMcpStdioServer | AcpMcpHttpServer

export function isAcpHttpMcp(server: AcpMcpServer): server is AcpMcpHttpServer {
  return "type" in server
}

/** 按握手能力丢掉 Agent 不认的 HTTP/SSE 项。stdio 始终保留。 */
export function filterAcpMcpServers(
  servers: AcpMcpServer[],
  caps: { http: boolean; sse: boolean }
): AcpMcpServer[] {
  return servers.filter((server) => {
    if (!isAcpHttpMcp(server)) return true
    if (server.type === "http") return caps.http
    return caps.sse
  })
}

export function acpMcpFingerprint(servers: AcpMcpServer[]): string {
  return JSON.stringify(servers)
}

/** 只读握手里的 MCP 广告；UI 不画这些字段。 */
export function parseAgentMcpCaps(initializeResult: unknown): { http: boolean; sse: boolean } {
  return parseAcpSessionCaps(initializeResult).mcp
}
