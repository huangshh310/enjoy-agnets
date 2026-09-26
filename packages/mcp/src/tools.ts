/**
 * MCP tools/list 结果解析与写操作启发式。不信任 Server 字段形状。
 */

export type McpToolInfo = {
  name: string
  description?: string
  inputSchema?: unknown
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
      description: typeof row.description === "string" ? row.description : undefined,
      inputSchema: row.inputSchema
    })
  }
  return out
}

const MUTATING_NAME = /(write|delete|create|update|remove|put|patch|insert|drop|exec|kill|send)/i
/** 与 agent-core `MCP_SHELL_LEAF` 对齐：bash/shell 也要走审批，不能只靠 write 子串。 */
const SHELL_NAME = /^(bash|shell|sh|zsh|cmd|command|run_command|run-command|terminal)$/i

export function isMutatingToolName(name: string): boolean {
  const leaf = name.trim()
  return MUTATING_NAME.test(leaf) || SHELL_NAME.test(leaf)
}

export function mcpAgentToolName(serverId: string, toolName: string): string {
  return `mcp_${serverId}__${toolName}`.replace(/[^a-zA-Z0-9_]/g, "_")
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
