/**
 * StreamEvent v2：来源、结构化、资产折叠进当前助手消息。
 */
import { wrapApprovedAppHtml } from "@enjoy-agents/mcp/app-host"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import type { StreamPatch } from "./apply-stream-event"
import type { ThreadMessage } from "./chat-store"

export function applyV2Part(
  messages: ThreadMessage[],
  assistant: ThreadMessage,
  event: StreamEvent
): StreamPatch | null {
  if (event.type === "source.added") {
    assistant.sources = [
      ...(assistant.sources ?? []),
      {
        sourceId: event.sourceId,
        title: event.title,
        path: event.path,
        startLine: event.startLine,
        endLine: event.endLine,
        snippet: event.snippet
      }
    ]
    upsertComponent(assistant, "source-list", { sources: assistant.sources })
    return { messages, thinkingLabel: "Sources" }
  }
  if (event.type === "asset.created") {
    assistant.assets = [
      ...(assistant.assets ?? []),
      { assetId: event.assetId, mediaType: event.mediaType, name: event.name }
    ]
    upsertComponent(assistant, "asset-preview", { assets: assistant.assets })
    return { messages, thinkingLabel: "Asset" }
  }
  if (event.type === "structured.delta") {
    assistant.structured = event.partial
    upsertComponent(assistant, structuredComponentId(event.partial), { value: event.partial })
    return { messages, thinkingLabel: "Structured" }
  }
  if (event.type === "mcp.app") {
    const srcDoc = event.srcDoc?.trim()
    if (!srcDoc || event.phase === "error" || event.phase === "close") return { messages }
    const wrapped = srcDoc.includes("Content-Security-Policy") ? srcDoc : wrapApprovedAppHtml(srcDoc)
    const next = (assistant.mcpApps ?? []).filter((item) => item.resourceUri !== event.resourceUri)
    next.push({
      serverId: event.serverId,
      resourceUri: event.resourceUri,
      srcDoc: wrapped,
      title: event.title
    })
    assistant.mcpApps = next
    return { messages, thinkingLabel: "MCP App" }
  }
  return null
}

function upsertComponent(
  assistant: ThreadMessage,
  componentId: string,
  props: Record<string, unknown>
) {
  const next = (assistant.components ?? []).filter((item) => item.componentId !== componentId)
  next.push({ componentId, props })
  assistant.components = next
}

function structuredComponentId(value: unknown): "form" | "table" | "card" {
  if (Array.isArray(value)) return "table"
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>
    if (Array.isArray(rec.fields) || Array.isArray(rec.schema)) return "form"
    if (Array.isArray(rec.rows) || Array.isArray(rec.columns)) return "table"
  }
  return "card"
}
