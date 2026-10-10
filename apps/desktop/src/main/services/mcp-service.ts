/**
 * MCP Server 注册、连接、tools/list 与 tools/call。默认不信任；调用只在 main。
 */
import {
  deleteMcpServer,
  listMcpPermissions,
  listMcpServers,
  setMcpPermission,
  upsertMcpServer,
  type McpServerRow
} from "@enjoy-agents/db"
import {
  callMcpTool,
  connectMcpServer,
  createMcpHandleRegistry,
  decideMcpCall,
  disconnectMcpServer,
  isMutatingToolName,
  mcpCallAction,
  readMcpResource,
  type McpToolInfo,
  type PermissionLevel
} from "@enjoy-agents/mcp"
import { getDatabase } from "./database"
import { stampAndBroadcast } from "./event-bus"
import { createId } from "./ids"
import { mergeKeptSecrets, parseStringMap, redactJsonSecrets } from "./secret-map"

const handles = createMcpHandleRegistry()

export function listServers() {
  return listMcpServers(getDatabase()).map(toPublic)
}

/** ACP 透传候选：已信任且服务器级未 deny。不要求 Enjoy 已 connect。 */
export function listHostMcpCandidates() {
  return listMcpServers(getDatabase()).map((row) => ({
    id: row.id,
    name: row.name,
    transport: row.transport as "stdio" | "sse" | "http",
    command: row.command ?? undefined,
    url: row.url ?? undefined,
    env: parseEnvRef(row.envRef),
    trusted: row.trusted === 1,
    denied: listMcpPermissions(getDatabase(), row.id).some(
      (item) => item.scope === "server" && item.level === "deny"
    )
  }))
}

export function upsertServer(input: {
  id?: string
  name: string
  transport: "stdio" | "sse" | "http"
  command?: string
  url?: string
  envRef?: string
  allowedResourceUris: string[]
  modelVisibleTools: string[]
  appOnlyTools: string[]
  trusted: boolean
}) {
  const id = input.id ?? createId("mcp")
  const existing = listMcpServers(getDatabase()).find((item) => item.id === id)
  const row: McpServerRow = {
    id,
    name: input.name,
    transport: input.transport,
    command: input.command ?? null,
    url: input.url ?? null,
    envRef: nextEnvRef(input.envRef, existing?.envRef),
    allowedResourceUris: JSON.stringify(input.allowedResourceUris),
    modelVisibleTools: JSON.stringify(input.modelVisibleTools),
    appOnlyTools: JSON.stringify(input.appOnlyTools),
    trusted: input.trusted ? 1 : 0,
    createdAt: existing?.createdAt ?? Date.now()
  }
  upsertMcpServer(getDatabase(), row)
  return toPublic(row)
}

export function removeServer(id: string) {
  handles.close(id)
  deleteMcpServer(getDatabase(), id)
  return { ok: true }
}

export async function connectServer(id: string) {
  const row = requireServer(id)
  const handle = await connectMcpServer({
    id,
    transport: row.transport as "stdio" | "sse" | "http",
    command: row.command ?? undefined,
    url: row.url ?? undefined,
    env: parseEnvRef(row.envRef)
  })
  handles.set(id, handle)
  return toPublic(row)
}

/** App / resources/read 需要本机会话；ACP 开流时用户未必点过 Connect。 */
export async function connectServerIfNeeded(id: string) {
  const handle = handles.get(id)
  if (handle?.state === "connected") return
  await connectServer(id)
}

/** envRef 是 `{KEY: value}` JSON 串；坏 JSON 回空 env 不阻断连接。 */
function parseEnvRef(raw: string | null): Record<string, string> | undefined {
  return parseStringMap(raw)
}

function nextEnvRef(incoming: string | undefined, existing: string | null | undefined): string | null {
  if (incoming == null) return existing ?? null
  const merged = mergeKeptSecrets(parseStringMap(incoming) ?? {}, parseStringMap(existing))
  return Object.keys(merged).length > 0 ? JSON.stringify(merged) : null
}

export async function disconnectServer(id: string) {
  const current = handles.get(id)
  if (current) handles.set(id, await disconnectMcpServer(current))
  return toPublic(requireServer(id))
}

export async function testServer(id: string) {
  const result = await connectServer(id)
  if (result.connected) await disconnectServer(id)
  return { ok: result.connected, message: result.error ?? "Connected." }
}

export function listServerTools(id: string): McpToolInfo[] {
  return handles.get(id)?.tools ?? []
}

export async function callServerTool(
  id: string,
  name: string,
  args: unknown,
  options?: { fromApprovedAgent?: boolean }
) {
  const row = requireServer(id)
  const handle = handles.get(id)
  if (!handle || handle.state !== "connected") throw new Error("MCP server is not connected.")
  const mutating = isMutatingToolName(name)
  const decision = decideMcpCall({
    trusted: row.trusted === 1,
    level: permissionLevel(id, name),
    mutating
  })
  const action = mcpCallAction(decision)
  if (action === "deny") throw new Error(`MCP tool ${name} is denied.`)
  // renderer 的 mcp.call 不能把 ask 当执行；Agent ToolLoop 批准后才带 fromApprovedAgent。
  if (action === "wait" && !options?.fromApprovedAgent) {
    throw new Error(`MCP tool ${name} requires Agent approval.`)
  }
  stampAndBroadcast({ type: "mcp.tool", runId: id, serverId: id, toolName: name, phase: "start" }, id)
  try {
    const result = await callMcpTool(handle, name, args)
    stampAndBroadcast({ type: "mcp.tool", runId: id, serverId: id, toolName: name, phase: "result" }, id)
    return result
  } catch (error) {
    stampAndBroadcast({ type: "mcp.tool", runId: id, serverId: id, toolName: name, phase: "error" }, id)
    throw error
  }
}

/** trusted + URI 白名单通过后，才向已连接 Server 读资源。 */
export async function readServerResource(id: string, uri: string) {
  const row = requireServer(id)
  if (row.trusted !== 1) throw new Error("MCP App requires a trusted server.")
  const allowed = ["mcp://app", ...(JSON.parse(row.allowedResourceUris) as string[])]
  if (!allowed.includes(uri)) return { ok: false as const, error: "uri-not-allowed" }
  const handle = handles.get(id)
  if (!handle?.request || handle.state !== "connected") {
    return { ok: false as const, error: "resource-read-requires-connected-server" }
  }
  const result = await readMcpResource(handle, uri)
  return { ok: true as const, result }
}

export function setPermission(input: { serverId: string; scope: string; name: string; level: string }) {
  setMcpPermission(getDatabase(), {
    id: createId("mp"),
    serverId: input.serverId,
    scope: input.scope,
    name: input.name,
    level: input.level
  })
  return { ok: true, permissions: listMcpPermissions(getDatabase(), input.serverId) }
}

export function listVisibleMcpTools(): Array<{
  serverId: string
  serverName: string
  trusted: boolean
  level?: PermissionLevel
  name: string
  description?: string
  inputSchema?: unknown
  readOnlyHint?: boolean
}> {
  const out: Array<{
    serverId: string
    serverName: string
    trusted: boolean
    level?: PermissionLevel
    name: string
    description?: string
    inputSchema?: unknown
    readOnlyHint?: boolean
  }> = []
  for (const row of listMcpServers(getDatabase())) {
    const handle = handles.get(row.id)
    if (handle?.state !== "connected") continue
    const visible = JSON.parse(row.modelVisibleTools) as string[]
    for (const tool of handle.tools ?? []) {
      if (visible.length > 0 && !visible.includes(tool.name)) continue
      if (visible.length === 0 && row.trusted !== 1) continue
      const mutating = tool.readOnlyHint === true ? false : isMutatingToolName(tool.name)
      const level = permissionLevel(row.id, tool.name)
      if (decideMcpCall({ trusted: row.trusted === 1, level, mutating }) === "deny") continue
      out.push({
        serverId: row.id,
        serverName: row.name,
        trusted: row.trusted === 1,
        level,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        ...(tool.readOnlyHint === true ? { readOnlyHint: true } : {})
      })
    }
  }
  return out
}

function permissionLevel(serverId: string, toolName: string): PermissionLevel | undefined {
  const rows = listMcpPermissions(getDatabase(), serverId)
  const tool = rows.find((row) => row.scope === "tool" && row.name === toolName)
  const server = rows.find((row) => row.scope === "server")
  const level = tool?.level ?? server?.level
  return level === "deny" || level === "ask" || level === "allow" ? level : undefined
}

function requireServer(id: string): McpServerRow {
  const row = listMcpServers(getDatabase()).find((item) => item.id === id)
  if (!row) throw new Error("MCP server not found.")
  return row
}

function toPublic(row: McpServerRow) {
  const handle = handles.get(row.id)
  return {
    id: row.id,
    name: row.name,
    transport: row.transport,
    command: row.command ?? undefined,
    url: row.url ?? undefined,
    envRef: redactJsonSecrets(row.envRef ?? undefined),
    allowedResourceUris: JSON.parse(row.allowedResourceUris) as string[],
    modelVisibleTools: JSON.parse(row.modelVisibleTools) as string[],
    appOnlyTools: JSON.parse(row.appOnlyTools) as string[],
    trusted: row.trusted === 1,
    connected: handle?.state === "connected",
    error: handle?.error,
    tools: handle?.tools ?? []
  }
}
