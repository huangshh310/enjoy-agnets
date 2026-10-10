/**
 * MCP tools/list 结果解析与写操作启发式。不信任 Server 字段形状。
 */

export type McpToolInfo = {
  name: string
  description?: string
  inputSchema?: unknown
  readOnlyHint?: boolean
}

export function parseToolsList(result: unknown): McpToolInfo[] {
  const tools = asRecord(result).tools
  if (!Array.isArray(tools)) return []
  const out: McpToolInfo[] = []
  for (const item of tools) {
    const row = asRecord(item)
    if (typeof row.name !== "string" || !row.name.trim()) continue
    const annotations = asRecord(row.annotations)
    out.push({
      name: row.name,
      description: typeof row.description === "string" ? row.description : undefined,
      inputSchema: row.inputSchema,
      ...(annotations.readOnlyHint === true ? { readOnlyHint: true } : {})
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

/** 精选预设 id。readOnlyHint 只对这些或用户已标 trusted 的服务器生效。 */
export const CURATED_MCP_SERVER_IDS = [
  "filesystem",
  "everything",
  "github",
  "postgres",
  "sqlite",
  "puppeteer",
  "brave-search",
  "memory",
  "docker",
  "redis",
  "gitlab",
  "slack",
  "notion",
  "linear",
  "sentry",
  "fetch",
  "sequential-thinking",
  "git",
  "mysql",
  "playwright"
] as const

const CURATED_MCP_SET = new Set<string>(CURATED_MCP_SERVER_IDS)

export function isCuratedMcpServerName(name: string | undefined | null): boolean {
  if (!name) return false
  const key = name.trim().toLowerCase()
  return CURATED_MCP_SET.has(key)
}

/** 未信任服务器的 hint 一律当写。trusted / 精选才认 readOnlyHint。 */
export function mcpReadOnlyHintApplies(input: {
  hint?: boolean
  trusted?: boolean
  curated?: boolean
}): boolean {
  if (input.hint !== true) return false
  return input.trusted === true || input.curated === true
}

/** 审批层与权限层共用：默认写，只有可信 hint 才只读。 */
export function mcpToolRequiresWriteApproval(input: {
  readOnlyHint?: boolean
  trusted?: boolean
  curated?: boolean
}): boolean {
  return !mcpReadOnlyHintApplies({
    hint: input.readOnlyHint,
    trusted: input.trusted,
    curated: input.curated
  })
}

export function mcpAgentToolName(serverId: string, toolName: string): string {
  return `mcp_${serverId}__${toolName}`.replace(/[^a-zA-Z0-9_]/g, "_")
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
