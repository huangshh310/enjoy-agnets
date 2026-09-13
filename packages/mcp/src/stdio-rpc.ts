/**
 * MCP stdio JSON-RPC：Content-Length 分帧。不信任 Server 输出。
 */
export type JsonRpcRequest = {
  jsonrpc: "2.0"
  id: number
  method: string
  params?: unknown
}

export type JsonRpcResponse = {
  jsonrpc: "2.0"
  id?: number
  result?: unknown
  error?: { code: number; message: string }
}

export function encodeMessage(payload: unknown): Buffer {
  return Buffer.from(JSON.stringify(payload) + "\n", "utf8")
}

export function decodeMessages(buffer: Buffer): { messages: JsonRpcResponse[]; rest: Buffer } {
  const messages: JsonRpcResponse[] = []
  let rest = buffer
  while (rest.byteLength > 0) {
    // 兼容 Content-Length 分帧（LSP 风格）
    const headerEnd = indexOfHeaderEnd(rest)
    if (headerEnd >= 0) {
      const header = rest.subarray(0, headerEnd).toString("utf8")
      const length = contentLength(header)
      if (length != null) {
        const start = headerEnd + 4
        if (rest.byteLength < start + length) break
        const raw = rest.subarray(start, start + length).toString("utf8")
        rest = rest.subarray(start + length)
        try {
          messages.push(JSON.parse(raw) as JsonRpcResponse)
        } catch {
          messages.push({ jsonrpc: "2.0", error: { code: -32700, message: "invalid-json" } })
        }
        continue
      }
    }

    // 标准 MCP stdio：换行符 (\n) 分帧 (ndjson)
    const newlineIndex = rest.indexOf(0x0a)
    if (newlineIndex < 0) break

    const lineBytes = rest.subarray(0, newlineIndex)
    rest = rest.subarray(newlineIndex + 1)
    const line = lineBytes.toString("utf8").trim()
    if (!line) continue

    try {
      const parsed = JSON.parse(line) as unknown
      if (parsed && typeof parsed === "object") {
        messages.push(parsed as JsonRpcResponse)
      }
    } catch {
      // 忽略子进程可能输出到 stdout 的非 JSON 诊断或日志行
    }
  }
  return { messages, rest }
}

export function initializeRequest(id = 1): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "enjoy-agents", version: "0.1.0" }
    }
  }
}

function indexOfHeaderEnd(buffer: Buffer): number {
  const text = buffer.toString("latin1")
  return text.indexOf("\r\n\r\n")
}

function contentLength(header: string): number | null {
  const match = header.match(/Content-Length:\s*(\d+)/i)
  if (!match?.[1]) return null
  return Number(match[1])
}
