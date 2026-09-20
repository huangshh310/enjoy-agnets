/**
 * ACP initialize 的 session 能力。v1 mcpCapabilities 与 v2 capabilities.session 并存。
 */
export type AcpSessionCaps = {
  protocolVersion: number
  list: boolean
  resume: boolean
  close: boolean
  delete: boolean
  mcp: { http: boolean; sse: boolean }
}

export const EMPTY_SESSION_CAPS: AcpSessionCaps = {
  protocolVersion: 1,
  list: false,
  resume: false,
  close: false,
  delete: false,
  mcp: { http: false, sse: false }
}

export function parseAcpSessionCaps(raw: unknown): AcpSessionCaps {
  const rec = asRecord(raw)
  const protocolVersion = Number(rec.protocolVersion ?? 1)
  const v2Session = rec.capabilities != null ? asRecord(rec.capabilities).session : undefined
  const hasSession = v2Session != null && typeof v2Session === "object"
  const nested = asRecord(v2Session)
  const mcp = asRecord(nested.mcp)
  const legacy = asRecord(asRecord(rec.agentCapabilities).mcpCapabilities)
  return {
    protocolVersion: Number.isFinite(protocolVersion) ? protocolVersion : 1,
    list: hasSession,
    resume: hasSession,
    close: hasSession,
    delete: hasSession && advertised(nested.delete),
    mcp: {
      http: advertised(mcp.http) || advertised(legacy.http),
      sse: advertised(mcp.sse) || advertised(legacy.sse)
    }
  }
}

export function advertised(value: unknown): boolean {
  if (value === true) return true
  return Boolean(value && typeof value === "object")
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
