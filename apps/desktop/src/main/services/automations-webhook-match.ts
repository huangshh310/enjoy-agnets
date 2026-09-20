/**
 * 本机 webhook 入站匹配：路径、可选 token。不认公网 Host。
 */
import type { Automation } from "@enjoy-agents/ipc-contract"

const DEFAULT_WEBHOOK_PATH = "/hooks/enjoy"

export const WEBHOOK_LISTEN_HOST = "127.0.0.1"

export type WebhookRoute = {
  id: string
  path: string
  secret?: string
}

export function normalizeWebhookPath(raw?: string): string {
  const trimmed = raw?.trim() || DEFAULT_WEBHOOK_PATH
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1)
  return withSlash
}

export function webhookRoutesFrom(items: Automation[]): Map<number, WebhookRoute[]> {
  const grouped = new Map<number, WebhookRoute[]>()
  for (const item of items) {
    if (!item.enabled || item.trigger !== "webhook" || item.webhookPort == null) continue
    const route: WebhookRoute = {
      id: item.id,
      path: normalizeWebhookPath(item.webhookPath),
      secret: item.webhookSecret?.trim() || undefined
    }
    const current = grouped.get(item.webhookPort) ?? []
    current.push(route)
    grouped.set(item.webhookPort, current)
  }
  return grouped
}

export function readWebhookToken(
  headers: Record<string, string | string[] | undefined>,
  url: URL
): string | undefined {
  const authorization = headerValue(headers.authorization)
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim()
  const enjoy = headerValue(headers["x-enjoy-token"])
  if (enjoy) return enjoy
  const hook = headerValue(headers["x-webhook-token"])
  if (hook) return hook
  return url.searchParams.get("token") ?? undefined
}

export function isLoopbackHost(hostHeader?: string): boolean {
  const host = (hostHeader ?? "").trim().toLowerCase()
  if (!host) return false
  if (host.startsWith("[")) {
    const end = host.indexOf("]")
    const name = end === -1 ? host : host.slice(1, end)
    return name === "::1"
  }
  const name = host.split(":")[0] ?? ""
  return name === "127.0.0.1" || name === "localhost"
}

export function matchWebhookRoutes(
  method: string,
  url: URL,
  headers: Record<string, string | string[] | undefined>,
  routes: WebhookRoute[]
): { status: number; matched: WebhookRoute[]; error?: string } {
  if (method.toUpperCase() !== "POST") {
    return { status: 405, matched: [], error: "method_not_allowed" }
  }
  if (!isLoopbackHost(headerValue(headers.host) ?? url.hostname)) {
    return { status: 403, matched: [], error: "not_loopback" }
  }
  const path = normalizeWebhookPath(url.pathname)
  const candidates = routes.filter((route) => route.path === path)
  if (candidates.length === 0) return { status: 404, matched: [], error: "not_found" }
  const token = readWebhookToken(headers, url)
  const matched = candidates.filter((route) => !route.secret || route.secret === token)
  if (matched.length === 0) return { status: 401, matched: [], error: "unauthorized" }
  return { status: 202, matched }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]?.trim()
  return value?.trim()
}
