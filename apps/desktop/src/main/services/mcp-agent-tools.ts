/**
 * 把已连接且可见的 MCP 工具注入 ToolLoopAgent。密钥与进程只在 main。
 */
// @ts-nocheck — 与 createCodingTools 相同：AI SDK Tool 泛型与 Zod 4 record 不合。
import { tool } from "ai"
import { z } from "zod"
import { mcpAgentToolName } from "@enjoy-agents/mcp"
import { callServerTool, listVisibleMcpTools } from "./mcp-service"

export function createMcpAgentTools(): Record<string, object> {
  const tools: Record<string, object> = {}
  for (const item of listVisibleMcpTools()) {
    const id = mcpAgentToolName(item.serverId, item.name)
    tools[id] = tool({
      description: `MCP ${item.serverName}: ${item.description ?? item.name}`,
      inputSchema: z.record(z.string(), z.unknown()),
      // ToolLoop 已对 mcp_* 写工具走 user-approval；execute 只在批准后到达。
      execute: async (input: Record<string, unknown>) =>
        callServerTool(item.serverId, item.name, input, { fromApprovedAgent: true })
    })
  }
  return tools
}
