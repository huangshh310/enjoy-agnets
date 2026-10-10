/**
 * MCP 本会话允许绑服务器配置指纹：command / url / transport / envRef 变了即作废。
 * 必须读库行原文，listServers() 会 redact envRef。
 */
import { listMcpServers } from "@enjoy-agents/db"
import { mcpAgentToolName } from "@enjoy-agents/mcp"
import { mcpToolLeafName } from "@enjoy-agents/agent-core"
import { getDatabase } from "./database.ts"
import { mcpServerConfigFingerprint } from "./mcp-session-fingerprint-key.ts"

export { mcpServerConfigFingerprint }

export function mcpFingerprintForTool(toolName: string): string | undefined {
  if (!toolName.startsWith("mcp_")) return undefined
  const leaf = mcpToolLeafName(toolName)
  for (const server of listMcpServers(getDatabase())) {
    if (mcpAgentToolName(server.id, leaf) === toolName) {
      return mcpServerConfigFingerprint(server)
    }
  }
  return undefined
}
