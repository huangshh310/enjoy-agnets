/**
 * MCP App 隔离约定：iframe + 严格 CSP + 无 Node + 受限 postMessage。
 */
/** srcDoc 没有同源脚本文件，必须允许 inline；同时禁止联网与读盘。 */
export const MCP_APP_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-ancestors 'self'"

export type JsonRpcMessage = {
  jsonrpc: "2.0"
  id?: string | number
  method?: string
  params?: unknown
  result?: unknown
  error?: { code: number; message: string }
}

const ALLOWED_METHODS = new Set(["tools/result", "resources/read", "ui/log", "ui/update"])

export function sanitizeAppMessage(
  raw: unknown,
  allowedUris: string[]
): JsonRpcMessage | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "invalid-message" }
  const message = raw as JsonRpcMessage
  if (message.jsonrpc !== "2.0") return { error: "invalid-jsonrpc" }
  if (message.method && !ALLOWED_METHODS.has(message.method)) {
    return { error: "method-not-allowed" }
  }
  if (message.method === "resources/read") {
    const uri = uriFrom(message.params)
    if (!uri || !allowedUris.includes(uri)) return { error: "uri-not-allowed" }
  }
  return message
}

/** 给已批准 App 包一层 CSP，禁止连外网和读盘。 */
export function wrapApprovedAppHtml(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${MCP_APP_CSP}"></head><body>${body}</body></html>`
}

export function approvedDemoAppHtml(): string {
  return wrapApprovedAppHtml(`
<p data-testid="mcp-app-ready">Approved MCP App</p>
<button type="button" data-testid="mcp-app-log" onclick="parent.postMessage({jsonrpc:'2.0',method:'ui/log',params:{text:'app-log-ok'}},'*')">Log</button>
`)
}

export function uriFrom(params: unknown): string | undefined {
  if (params && typeof params === "object" && "uri" in params) {
    const uri = (params as { uri?: unknown }).uri
    return typeof uri === "string" ? uri : undefined
  }
  return undefined
}
