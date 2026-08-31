/**
 * MCP App：只渲染已批准 HTML。iframe 消息经 sanitize，不执行任意工具。
 */
import { approvedDemoAppHtml, sanitizeAppMessage, uriFrom } from "@enjoy-agents/mcp"
import { stampAndBroadcast } from "./event-bus"
import { isE2eStub } from "./e2e-stub"
import { listServers, readServerResource } from "./mcp-service"

export function openMcpApp(serverId: string, resourceUri?: string) {
  const server = requireTrusted(serverId)
  const allowed = allowedUris(server.allowedResourceUris)
  stampAndBroadcast(
    { type: "mcp.app", runId: serverId, serverId, resourceUri: resourceUri ?? "mcp://app", phase: "open" },
    serverId
  )
  return {
    srcDoc: approvedDemoAppHtml(),
    allowedResourceUris: allowed,
    title: server.name
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
    return "resource-read-ok"
  }
}
