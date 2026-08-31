/**
 * MCP Streamable HTTP / SSE：SDK 无 createMCPClient 时的本机握手与 JSON-RPC。
 * 不把远程脚本引进 renderer。
 */
import { initializeRequest, type JsonRpcResponse } from "./stdio-rpc.ts"

export type RpcPostResult = {
  ok: boolean
  result?: unknown
  error?: string
  sessionId?: string
}

export function parseSseData(text: string): JsonRpcResponse[] {
  const messages: JsonRpcResponse[] = []
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("")
    if (!data) continue
    try {
      messages.push(JSON.parse(data) as JsonRpcResponse)
    } catch {
      messages.push({ jsonrpc: "2.0", error: { code: -32700, message: "invalid-sse-json" } })
    }
  }
  return messages
}

export async function rpcPost(
  url: string,
  input: { id: number; method: string; params?: unknown },
  options: { sessionId?: string; fetchImpl?: typeof fetch } = {}
): Promise<RpcPostResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream"
  }
  if (options.sessionId) headers["mcp-session-id"] = options.sessionId
  const response = await fetchImpl(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: input.id, method: input.method, params: input.params })
  })
  const sessionId = response.headers.get("mcp-session-id") ?? options.sessionId ?? undefined
  if (!response.ok) return { ok: false, error: `HTTP ${response.status}`, sessionId }
  const type = response.headers.get("content-type") ?? ""
  const text = await response.text()
  const messages = type.includes("text/event-stream") ? parseSseData(text) : [safeJson(text)]
  const failed = messages.find((message) => message.error)
  if (failed?.error) return { ok: false, error: failed.error.message, sessionId }
  const ok = messages.find((message) => message.result !== undefined)
  if (ok) return { ok: true, result: ok.result, sessionId }
  return { ok: false, error: `MCP ${input.method} had no result.`, sessionId }
}

export async function handshakeHttp(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: boolean; error?: string; sessionId?: string }> {
  const init = initializeRequest()
  const posted = await rpcPost(url, init, { fetchImpl })
  return posted.ok
    ? { ok: true, sessionId: posted.sessionId }
    : { ok: false, error: posted.error ?? "MCP HTTP handshake had no result.", sessionId: posted.sessionId }
}

export async function handshakeSse(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: boolean; error?: string; sessionId?: string }> {
  const posted = await handshakeHttp(url, fetchImpl)
  if (posted.ok) return posted
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { accept: "text/event-stream" }
  })
  if (!response.ok) return { ok: false, error: posted.error ?? `SSE ${response.status}` }
  const messages = parseSseData(await response.text())
  if (messages.some((message) => message.result)) {
    return { ok: true, sessionId: response.headers.get("mcp-session-id") ?? undefined }
  }
  return { ok: false, error: posted.error ?? "SSE handshake had no result." }
}

function safeJson(text: string): JsonRpcResponse {
  try {
    return JSON.parse(text) as JsonRpcResponse
  } catch {
    return { jsonrpc: "2.0", error: { code: -32700, message: "invalid-json" } }
  }
}
