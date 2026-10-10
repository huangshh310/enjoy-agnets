/**
 * 把已连接且可见的 MCP 工具注入 ToolLoopAgent。密钥与进程只在 main。
 */
// @ts-nocheck — 与 createCodingTools 相同：AI SDK Tool 泛型与 Zod 4 record 不合。
import { tool } from "ai"
import { z } from "zod"
import { CLIP_COMMAND_CHARS, clipToolPayload, isMcpWriteToolName, jsonSchemaToZod } from "@enjoy-agents/agent-core"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import { rememberMcpReadOnlyHint } from "@enjoy-agents/ipc-contract/tool-names"
import { isMutatingToolName, mcpAgentToolName } from "@enjoy-agents/mcp"
import { callServerTool, listVisibleMcpTools } from "./mcp-service"

export function createMcpAgentTools(opts?: { mode?: AgentMode }): Record<string, object> {
  const readOnly = opts?.mode === "plan" || opts?.mode === "ask"
  const tools: Record<string, object> = {}
  for (const item of listVisibleMcpTools()) {
    const id = mcpAgentToolName(item.serverId, item.name)
    rememberMcpReadOnlyHint(id, item.readOnlyHint === true)
    if (readOnly && isMcpWriteToolName(id)) continue
    tools[id] = tool({
      description: `MCP ${item.serverName}: ${item.description ?? item.name}`,
      inputSchema: item.inputSchema ? jsonSchemaToZod(item.inputSchema) : z.record(z.string(), z.unknown()),
      // 只有写/命令类工具才会在 ToolLoop 批准后进 execute；读工具不得冒充已批。
      execute: async (input: Record<string, unknown>) => {
        const approved = isMutatingToolName(item.name) || isMcpWriteToolName(id)
        const result = await callServerTool(
          item.serverId,
          item.name,
          input,
          approved ? { fromApprovedAgent: true } : undefined
        )
        return clipToolPayload(result, CLIP_COMMAND_CHARS)
      }
    })
  }
  return tools
}
