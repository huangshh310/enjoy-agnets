/**
 * MCP 客户端：优先 AI SDK createMCPClient；否则 stdio / HTTP 会话可 list+call。
 * 失败隔离为 error，不抛到 renderer。
 */
import { handshakeHttp, handshakeSse, rpcPost } from "./http-rpc.ts"
import { createStdioSession, type McpSession } from "./stdio-session.ts"
import { initializeRequest } from "./stdio-rpc.ts"
import { parseStdioCommand } from "./stdio-command.ts"
import { filteredStdioEnv, spawnStdioProcess } from "./stdio-spawn.ts"
import { parseToolsList, type McpToolInfo } from "./tools.ts"

export type McpConnectionState = "idle" | "connecting" | "connected" | "error"

export type McpClientHandle = {
  id: string
  state: McpConnectionState
  error?: string
  tools?: McpToolInfo[]
  request?: (method: string, params?: unknown) => Promise<unknown>
  close?: () => void
}

const HANDSHAKE_MS = 25_000

export async function connectMcpServer(input: {
  id: string
  transport: "stdio" | "sse" | "http"
  command?: string
  url?: string
  /** stdio Server 的附加环境变量；与主进程 env 合并后注入子进程。 */
  env?: Record<string, string>
}): Promise<McpClientHandle> {
  if (input.transport === "stdio" && !input.command) {
    return { id: input.id, state: "error", error: "stdio transport requires a command." }
  }
  if (input.transport === "stdio" && input.command) {
    parseStdioCommand(input.command)
  }
  if ((input.transport === "sse" || input.transport === "http") && !input.url) {
    return { id: input.id, state: "error", error: "HTTP/SSE transport requires a URL." }
  }
  try {
    const sdk = await tryCreateSdkClient(input)
    if (sdk) return sdk
    if (input.transport === "stdio" && input.command) {
      return await connectStdio(input.id, input.command, input.env)
    }
    if ((input.transport === "sse" || input.transport === "http") && input.url) {
      return await connectHttp(input.id, input.url, input.transport)
    }
    return { id: input.id, state: "error", error: "SSE/HTTP MCP requires a URL." }
  } catch (error) {
    return {
      id: input.id,
      state: "error",
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function disconnectMcpServer(handle: McpClientHandle): Promise<McpClientHandle> {
  handle.close?.()
  return { id: handle.id, state: "idle", tools: [] }
}

export async function listMcpTools(handle: McpClientHandle): Promise<McpToolInfo[]> {
  if (!handle.request) return handle.tools ?? []
  try {
    return parseToolsList(await handle.request("tools/list"))
  } catch {
    return handle.tools ?? []
  }
}

export async function callMcpTool(
  handle: McpClientHandle,
  name: string,
  args: unknown
): Promise<unknown> {
  if (!handle.request || handle.state !== "connected") {
    throw new Error("MCP server is not connected.")
  }
  return handle.request("tools/call", { name, arguments: args ?? {} })
}

/** 已连接会话上的 resources/read；URI 白名单在调用方校验。 */
export async function readMcpResource(handle: McpClientHandle, uri: string): Promise<unknown> {
  if (!handle.request || handle.state !== "connected") {
    throw new Error("MCP server is not connected.")
  }
  return handle.request("resources/read", { uri })
}

async function tryCreateSdkClient(input: {
  id: string
  transport: "stdio" | "sse" | "http"
  command?: string
  url?: string
  env?: Record<string, string>
}): Promise<McpClientHandle | null> {
  const mod = (await import("ai")) as Record<string, unknown>
  const create = mod.createMCPClient as
    | ((options: unknown) => Promise<{
        close?: () => Promise<void>
        tools?: unknown
      }>)
    | undefined
  if (typeof create !== "function") return null
  const client = await create(
    input.transport === "stdio"
      ? { transport: { type: "stdio", command: input.command, env: filteredStdioEnv(input.env) } }
      : { transport: { type: input.transport, url: input.url } }
  )
  return {
    id: input.id,
    state: "connected",
    tools: parseToolsList(client.tools),
    close: () => {
      void client.close?.()
    }
  }
}

async function connectStdio(
  id: string,
  command: string,
  overrides?: Record<string, string>
): Promise<McpClientHandle> {
  const parsed = parseStdioCommand(command)
  const child = spawnStdioProcess(parsed.bin, parsed.args, filteredStdioEnv(overrides))
  const session = createStdioSession(child, HANDSHAKE_MS)
  return finishSession(id, session, async () => {
    await session.request("initialize", initializeRequest().params)
    session.notify("notifications/initialized")
  })
}

async function connectHttp(
  id: string,
  url: string,
  transport: "sse" | "http"
): Promise<McpClientHandle> {
  const handshake = transport === "sse" ? handshakeSse : handshakeHttp
  const result = await handshake(url)
  if (!result.ok) return { id, state: "error", error: result.error }
  let nextId = 2
  let sessionId = typeof result.sessionId === "string" ? result.sessionId : undefined
  const session: McpSession = {
    async request(method, params) {
      const posted = await rpcPost(url, { id: nextId, method, params }, { sessionId })
      nextId += 1
      if (posted.sessionId) sessionId = posted.sessionId
      if (!posted.ok) throw new Error(posted.error ?? `MCP ${method} failed.`)
      return posted.result
    },
    notify() {
      return
    },
    close() {
      return
    }
  }
  return finishSession(id, session, async () => undefined)
}

async function finishSession(
  id: string,
  session: McpSession,
  afterConnect: () => Promise<void>
): Promise<McpClientHandle> {
  try {
    await afterConnect()
    const tools = await listFromSession(session)
    return {
      id,
      state: "connected",
      tools,
      request: (method, params) => session.request(method, params),
      close: () => session.close()
    }
  } catch (error) {
    session.close()
    return {
      id,
      state: "error",
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function listFromSession(session: McpSession): Promise<McpToolInfo[]> {
  try {
    return parseToolsList(await session.request("tools/list"))
  } catch {
    return []
  }
}
