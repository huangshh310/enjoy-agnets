/**
 * MCP tools/list 结果解析与写操作启发式。不信任 Server 字段形状。
 */

export type McpToolInfo = {
  name: string
  description?: string
}

export function parseToolsList(result: unknown): McpToolInfo[] {
  const tools = asRecord(result).tools
  if (!Array.isArray(tools)) return []
  const out: McpToolInfo[] = []
  for (const item of tools) {
    const row = asRecord(item)
    if (typeof row.name !== "string" || !row.name.trim()) continue
    out.push({
      name: row.name,
      description: typeof row.description === "string" ? row.description : undefined
    })
  }
  return out
}

export function isMutatingToolName(name: string): boolean {
  return /(write|delete|create|update|remove|put|patch|insert|drop|exec|kill|send)/i.test(name)
}

export function mcpAgentToolName(serverId: string, toolName: string): string {
  return `mcp_${serverId}__${toolName}`.replace(/[^a-zA-Z0-9_]/g, "_")
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
