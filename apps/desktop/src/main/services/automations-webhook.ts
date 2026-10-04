/**
 * 本机 webhook 监听：只绑 127.0.0.1。关应用停听，不转发云、不开隧道。
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { Automation } from "@enjoy-agents/ipc-contract"
import {
  matchWebhookRoutes,
  WEBHOOK_LISTEN_HOST,
  webhookRoutesFrom,
  type WebhookRoute
} from "./automations-webhook-match.ts"

type LaunchWebhook = (item: Automation) => Promise<void>

type PortListener = {
  server: Server
  routes: WebhookRoute[]
  items: Map<string, Automation>
}

const listeners = new Map<number, PortListener>()
let launchWebhook: LaunchWebhook | undefined

export function setWebhookLauncher(next: LaunchWebhook): void {
  launchWebhook = next
}

export function resetWebhookLauncher(): void {
  launchWebhook = undefined
}

export function webhookListenHost(): string {
  return WEBHOOK_LISTEN_HOST
}

export function listeningWebhookPorts(): number[] {
  return [...listeners.keys()].sort((left, right) => left - right)
}

export async function syncWebhookListeners(items?: Automation[]): Promise<void> {
  const list = items ?? (await import("./automations-store")).readAutomations()
  return applyWebhookListeners(list)
}

async function applyWebhookListeners(items: Automation[]): Promise<void> {
  const wanted = webhookRoutesFrom(items)
  const byId = new Map(items.map((item) => [item.id, item]))
  for (const [port, routes] of wanted) {
    const existing = listeners.get(port)
    if (existing) {
      existing.routes = routes
      existing.items = byId
      continue
    }
    await listenPort(port, routes, byId)
  }
  // closePort 会从 listeners 里删键，必须先快照，否则迭代期间漏端口。
  // eslint-disable-next-line unicorn/no-useless-spread
  for (const port of [...listeners.keys()]) {
    if (!wanted.has(port)) await closePort(port)
  }
}

export async function stopWebhookListeners(): Promise<void> {
  await Promise.all([...listeners.keys()].map((port) => closePort(port)))
}

async function defaultLaunchWebhook(item: Automation): Promise<void> {
  const { firstLiveWindow } = await import("./automations-notify")
  const { launchAutomationAgent } = await import("./automations-run")
  const window = firstLiveWindow()
  if (!window) throw new Error("App window not available.")
  await launchAutomationAgent(window, item)
}

async function listenPort(
  port: number,
  routes: WebhookRoute[],
  items: Map<string, Automation>
): Promise<void> {
  const state: PortListener = {
    server: createServer(),
    routes,
    items
  }
  state.server = createServer((req, res) => {
    void handleWebhookRequest(req, res, state)
  })
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      state.server.off("error", onError)
      reject(error)
    }
    state.server.once("error", onError)
    state.server.listen(port, WEBHOOK_LISTEN_HOST, () => {
      state.server.off("error", onError)
      resolve()
    })
  })
  listeners.set(port, state)
}

async function closePort(port: number): Promise<void> {
  const existing = listeners.get(port)
  if (!existing) return
  listeners.delete(port)
  await new Promise<void>((resolve) => {
    existing.server.close(() => resolve())
  })
}

async function handleWebhookRequest(
  req: IncomingMessage,
  res: ServerResponse,
  state: PortListener
): Promise<void> {
  req.resume()
  const host = req.headers.host ?? WEBHOOK_LISTEN_HOST
  const url = new URL(req.url ?? "/", `http://${host}`)
  const matched = matchWebhookRoutes(req.method ?? "GET", url, req.headers, state.routes)
  if (matched.status !== 202) {
    writeJson(res, matched.status, { ok: false, error: matched.error })
    return
  }
  const jobs = matched.matched
    .map((route) => state.items.get(route.id))
    .filter((item): item is Automation =>
      Boolean(item?.enabled && (item.trigger === "webhook" || item.triggers?.includes("webhook")))
    )
  if (jobs.length === 0) {
    writeJson(res, 404, { ok: false, error: "not_found" })
    return
  }
  try {
    const launch = launchWebhook ?? defaultLaunchWebhook
    await Promise.all(jobs.map((item) => launch(item)))
    writeJson(res, 202, { ok: true, ids: jobs.map((item) => item.id) })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeJson(res, 503, { ok: false, error: message })
  }
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
  res.end(JSON.stringify(body))
}
