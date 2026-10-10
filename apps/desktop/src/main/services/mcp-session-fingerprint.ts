/**
 * MCP 本会话允许绑服务器配置指纹：command / url / transport 变了即作废。
 */
import { mcpAgentToolName } from "@enjoy-agents/mcp"
import { mcpToolLeafName } from "@enjoy-agents/agent-core"
import { listServers } from "./mcp-service.ts"
import { mcpServerConfigFingerprint } from "./mcp-session-fingerprint-key.ts"

export { mcpServerConfigFingerprint }

export function mcpFingerprintForTool(toolName: string): string | undefined {
  if (!toolName.startsWith("mcp_")) return undefined
  const leaf = mcpToolLeafName(toolName)
  for (const server of listServers()) {
    if (mcpAgentToolName(server.id, leaf) === toolName) {
      return mcpServerConfigFingerprint(server)
    }
  }
  return undefined
}
