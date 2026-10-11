/**
 * 助手轮 MCP App 表面：超大 srcDoc 只留中性提示，不带大小、不带 iframe。
 */
import type { ThreadMcpApp } from "../stores/chat-store.types.ts"

export type McpAppSurface =
  | { kind: "frame"; srcDoc: string; title?: string }
  | { kind: "too_large" }
  | { kind: "hidden" }

export function mcpAppSurface(app: ThreadMcpApp): McpAppSurface {
  if (app.tooLarge) return { kind: "too_large" }
  const srcDoc = app.srcDoc.trim()
  if (srcDoc) return { kind: "frame", srcDoc, title: app.title }
  return { kind: "hidden" }
}

export function markMcpAppTooLarge(
  assistant: { mcpApps?: ThreadMcpApp[] },
  event?: { serverId?: string; resourceUri?: string; title?: string }
): void {
  const apps = [...(assistant.mcpApps ?? [])]
  const lastEmpty = [...apps].reverse().find((item) => !item.srcDoc.trim())
  if (lastEmpty) {
    lastEmpty.tooLarge = true
    lastEmpty.srcDoc = ""
    assistant.mcpApps = apps
    return
  }
  apps.push({
    serverId: event?.serverId?.trim() || "acp",
    resourceUri: event?.resourceUri?.trim() || "ui://mcp-app-too-large",
    srcDoc: "",
    title: event?.title,
    tooLarge: true
  })
  assistant.mcpApps = apps
}
