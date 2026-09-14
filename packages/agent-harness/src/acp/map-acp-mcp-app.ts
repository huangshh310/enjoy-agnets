/**
 * ACP tool_call 内容里的 MCP App HTML / ui 资源 → mcp.app 事件。
 * iframe 仍走宿主消毒；不把 CLI 私有 Plugin JS 跑进 Enjoy。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

export function mapAcpMcpApps(rec: Record<string, unknown>, runId: string): StreamEvent[] {
  const events: StreamEvent[] = []
  for (const app of extractAcpMcpApps(rec.content ?? rec.rawOutput ?? rec.output)) {
    events.push({
      type: "mcp.app",
      runId,
      serverId: app.serverId,
      resourceUri: app.resourceUri,
      phase: "open",
      srcDoc: app.srcDoc,
      title: app.title
    })
  }
  return events
}

export function extractAcpMcpApps(content: unknown): Array<{
  serverId: string
  resourceUri: string
  srcDoc: string
  title?: string
}> {
  const apps: Array<{ serverId: string; resourceUri: string; srcDoc: string; title?: string }> = []
  for (const item of flattenContent(content)) {
    const html = htmlFromBlock(item)
    if (!html) continue
    const uri = uriFromBlock(item) || "ui://acp-mcp-app"
    apps.push({
      serverId: "acp",
      resourceUri: uri,
      srcDoc: wrapAppHtml(html),
      title: titleFromBlock(item)
    })
  }
  return apps
}

function flattenContent(content: unknown): Record<string, unknown>[] {
  if (Array.isArray(content)) {
    return content.flatMap((item) => flattenContent(item))
  }
  if (!content || typeof content !== "object") return []
  const rec = content as Record<string, unknown>
  const nested = rec.content ?? rec.resource ?? rec.resourceContents
  const self = [rec]
  return nested && nested !== content ? [...self, ...flattenContent(nested)] : self
}

function htmlFromBlock(rec: Record<string, unknown>): string | undefined {
  const mime = String(rec.mimeType ?? rec.mime_type ?? "").toLowerCase()
  const text = typeof rec.text === "string" ? rec.text : typeof rec.blob === "string" ? rec.blob : ""
  if (!text.trim()) return undefined
  const looksUi = mime.includes("text/html") || mime.includes("mcp-app") || String(rec.type ?? "") === "resource"
  if (!looksUi && !looksLikeHtml(text)) return undefined
  if (!looksLikeHtml(text) && !mime.includes("html")) return undefined
  return text
}

function uriFromBlock(rec: Record<string, unknown>): string | undefined {
  const uri = rec.uri ?? rec.resourceUri
  return typeof uri === "string" && uri.trim() ? uri.trim() : undefined
}

function titleFromBlock(rec: Record<string, unknown>): string | undefined {
  const title = rec.title ?? rec.name
  return typeof title === "string" && title.trim() ? title.trim() : undefined
}

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trim().toLowerCase()
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html") || trimmed.includes("<body")
}

function wrapAppHtml(html: string): string {
  if (html.toLowerCase().includes("content-security-policy")) return html
  const inner = looksLikeHtml(html) ? html : `<div>${html}</div>`
  return inner
}
