/**
 * MCP App：能读到 Server HTML 才渲染；否则诚实空态。E2E stub 才给 demo。
 */
import { sanitizeAppMessage, uriFrom, wrapApprovedAppHtml, approvedDemoAppHtml } from "@enjoy-agents/mcp"
import type { McpOpenAppResult } from "@enjoy-agents/ipc-contract"
import { stampAndBroadcast } from "./event-bus"
import { isE2eStub } from "./e2e-stub"
import { connectServerIfNeeded, listServers, readServerResource } from "./mcp-service"

export async function openMcpApp(serverId: string, resourceUri?: string): Promise<McpOpenAppResult> {
  const server = requireTrusted(serverId)
  await ensureConnected(serverId)
  const allowed = allowedUris(server.allowedResourceUris)
  const uri = resourceUri && allowed.includes(resourceUri) ? resourceUri : allowed.find((item) => item !== "mcp://app")
  stampAndBroadcast(
    { type: "mcp.app", runId: serverId, serverId, resourceUri: uri ?? "mcp://app", phase: "open" },
    serverId
  )
  if (isE2eStub()) {
    return {
      srcDoc: approvedDemoAppHtml(),
      available: true,
      demo: true,
      title: server.name,
      allowedResourceUris: allowed
    }
  }
  const html = uri ? await readAppHtml(serverId, uri) : null
  return {
    srcDoc: html,
    available: Boolean(html),
    demo: false,
    title: server.name,
    allowedResourceUris: allowed
  }
}

export async function handleMcpAppMessage(serverId: string, raw: unknown) {
  const server = requireTrusted(serverId)
  const allowed = allowedUris(server.allowedResourceUris)
  const sanitized = sanitizeAppMessage(raw, allowed)
  if ("error" in sanitized) {
    stampAndBroadcast(
      { type: "mcp.app", runId: serverId, serverId, resourceUri: "mcp://app", phase: "error" },
      serverId
    )
    return { ok: false, error: sanitized.error }
  }
  if (sanitized.method === "resources/read") {
    return readResource(serverId, sanitized.params)
  }
  const text = logText(sanitized.params)
  stampAndBroadcast(
    { type: "mcp.app", runId: serverId, serverId, resourceUri: "mcp://app", phase: "update" },
    serverId
  )
  return { ok: true, method: sanitized.method, text }
}

async function readAppHtml(serverId: string, uri: string): Promise<string | null> {
  const read = await readServerResource(serverId, uri)
  if (!read.ok) return null
  const text = resourceText(read.result)
  if (!looksLikeHtml(text)) return null
  return wrapApprovedAppHtml(text)
}

async function readResource(serverId: string, params: unknown) {
  const uri = uriFrom(params)
  if (!uri) return { ok: false, error: "uri-not-allowed" }
  if (isE2eStub()) {
    stampAndBroadcast(
      { type: "mcp.app", runId: serverId, serverId, resourceUri: uri, phase: "update" },
      serverId
    )
    return { ok: true, method: "resources/read", text: "stub-resource" }
  }
  const read = await readServerResource(serverId, uri)
  stampAndBroadcast(
    {
      type: "mcp.app",
      runId: serverId,
      serverId,
      resourceUri: uri,
      phase: read.ok ? "update" : "error"
    },
    serverId
  )
  if (!read.ok) return { ok: false, error: read.error }
  return { ok: true, method: "resources/read", text: resourceText(read.result) }
}

async function ensureConnected(serverId: string) {
  await connectServerIfNeeded(serverId)
}

function requireTrusted(id: string) {
  const server = listServers().find((item) => item.id === id)
  if (!server) throw new Error("MCP server not found.")
  if (!server.trusted) throw new Error("MCP App requires a trusted server.")
  return server
}

function allowedUris(configured: string[]): string[] {
  return ["mcp://app", ...configured]
}

function logText(params: unknown): string | undefined {
  if (params && typeof params === "object" && "text" in params) {
    const text = (params as { text?: unknown }).text
    return typeof text === "string" ? text : undefined
  }
  return undefined
}

function resourceText(result: unknown): string {
  if (typeof result === "string") return result
  try {
    return JSON.stringify(result)
  } catch {
    return ""
  }
}

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trim().toLowerCase()
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html") || trimmed.includes("<body")
}
