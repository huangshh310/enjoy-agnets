/**
 * Computer Use 宿主会话：观察编号在这里签发，执行器只负责点。
 * 不 import Electron，单测可以塞一个假执行器。
 */
import { randomBytes } from "node:crypto"
import { createObservationLedger, type Observation, type ObservationElement } from "@enjoy-agents/agent-core/computer-use"
import { backgroundClickPossible, displaySession } from "./display-session.ts"
import { ExecutorFailure, type ExecutorHandle } from "./executor-client.ts"

const RESTORE_CODES = new Set([
  "needs_foreground",
  "integrity_blocked",
  "unknown_key",
  "no_display",
  "executor_missing",
  "permission_denied"
])

export type DesktopPermissions = { accessibility: boolean; screenCapture: boolean }

export type ActInput = {
  observationId: string
  action: string
  elementId?: string
  button?: "left" | "right" | "middle"
  count?: number
  text?: string
  key?: string
  x?: number
  y?: number
  x2?: number
  y2?: number
  dy?: number
  allowForeground?: boolean
  waitMs?: number
  appName?: string
  elementName?: string
}

type SessionCall = (method: string, params: Record<string, unknown>) => Promise<Record<string, unknown>>

export type DesktopSessionHooks = {
  permissions?: () => DesktopPermissions
  captureThumb?: (pid?: number) => Promise<string | null>
  onView?: (view: { observationId: string; appName: string; elements: Observation["elements"]; thumbnailPath?: string }) => void
}

export type DesktopSession = {
  doctor: () => Promise<Record<string, unknown>>
  listApps: () => Promise<Record<string, unknown>>
  snapshot: (pid?: number) => Promise<Record<string, unknown>>
  act: (input: ActInput) => Promise<Record<string, unknown>>
  screenshot: (pid?: number) => Promise<Record<string, unknown>>
  peek: (observationId: string) => Observation | null
}

/** 一个 Enjoy Local 会话共用的账本和执行器。 */
export function createDesktopSession(
  open: () => ExecutorHandle | null,
  hooks: DesktopSessionHooks = {}
): DesktopSession {
  const ledger = createObservationLedger()
  let executor: ExecutorHandle | null = null
  const permissions = hooks.permissions ?? (() => ({ accessibility: false, screenCapture: false }))
  const client = () => (executor ??= open())
  const call: SessionCall = (method, params) => callExecutor(client, method, params)
  return {
    doctor: () => doctorReport(client(), permissions()),
    listApps: () => call("list_apps", {}),
    snapshot: (pid) => rememberSnapshot(call, ledger, pid, hooks),
    act: (input) => actOnce(call, ledger, input, hooks),
    screenshot: (pid) => hostScreenshot(pid, hooks),
    peek: (observationId) => ledger.peek(observationId)
  }
}

async function doctorReport(ready: ExecutorHandle | null, perms: DesktopPermissions) {
  const session = displaySession()
  const base = { session, backgroundClick: backgroundClickPossible(session), accessibility: perms.accessibility, screenCapture: perms.screenCapture }
  if (!ready) return { success: false, code: "executor_missing", ...base }
  try {
    const result = await ready.request("doctor", {})
    return { success: true, ...base, ...asRecord(result) }
  } catch (error) {
    return { success: false, ...base, ...failureOf(error) }
  }
}

async function rememberSnapshot(
  call: SessionCall,
  ledger: ReturnType<typeof createObservationLedger>,
  pid: number | undefined,
  hooks: DesktopSessionHooks
) {
  const result = await call("snapshot", pid ? { pid } : {})
  if (result.success !== true) return result
  const observation = asObservation(result.observation)
  if (!observation) return { success: false, code: "bad_observation" }
  observation.id = `obs_${randomBytes(8).toString("hex")}`
  observation.createdAt = Date.now()
  const thumb = hooks.captureThumb ? await hooks.captureThumb(observation.pid) : null
  if (thumb) observation.thumbnailPath = thumb
  ledger.put(observation)
  hooks.onView?.({
    observationId: observation.id,
    appName: observation.appName,
    elements: observation.elements,
    thumbnailPath: observation.thumbnailPath
  })
  return { success: true, observationId: observation.id, appName: observation.appName, elements: observation.elements }
}

async function hostScreenshot(pid: number | undefined, hooks: DesktopSessionHooks) {
  if (!hooks.captureThumb) return { success: false, code: "screenshot_unavailable" }
  const path = await hooks.captureThumb(pid)
  if (!path) return { success: false, code: "screenshot_unavailable" }
  return { success: true, thumbnailPath: path }
}

async function actOnce(
  call: SessionCall,
  ledger: ReturnType<typeof createObservationLedger>,
  input: ActInput,
  hooks: DesktopSessionHooks
) {
  const taken = ledger.take(input.observationId)
  if (!taken.ok) return { success: false, code: taken.code }
  const acted = await call("act", actParams(taken.observation, input))
  if (acted.success !== true) {
    if (RESTORE_CODES.has(String(acted.code))) ledger.put(taken.observation)
    return acted
  }
  const next = await rememberSnapshot(call, ledger, taken.observation.pid, hooks)
  if (next.success === true) return { ...acted, observationId: next.observationId }
  return acted
}

function actParams(observation: Observation, input: ActInput): Record<string, unknown> {
  const element = observation.elements.find((item) => item.id === input.elementId)
  const key = input.key ? input.key.replace(/(^|\+)mod(?=\+|$)/gi, `$1${observation.platform === "darwin" ? "cmd" : "ctrl"}`) : input.key
  return {
    ...input,
    key,
    pid: observation.pid,
    windowId: observation.windowId,
    appName: observation.appName,
    elementName: element?.name ?? input.elementName,
    elementRole: element?.role
  }
}

async function callExecutor(client: () => ExecutorHandle | null, method: string, params: Record<string, unknown>) {
  const ready = client()
  if (!ready) return { success: false, code: "executor_missing" }
  try {
    const result = await ready.request(method, params)
    return { success: true, ...asRecord(result) }
  } catch (error) {
    return { success: false, ...failureOf(error) }
  }
}

function failureOf(error: unknown): { code: string; message: string } {
  if (error instanceof ExecutorFailure) return { code: error.code, message: error.message }
  return { code: "executor_error", message: error instanceof Error ? error.message : "executor_error" }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function asObservation(value: unknown): Observation | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (!Array.isArray(row.elements)) return null
  return {
    id: "pending",
    pid: typeof row.pid === "number" ? row.pid : 0,
    windowId: typeof row.windowId === "string" ? row.windowId : String(row.pid ?? ""),
    appName: typeof row.appName === "string" ? row.appName : "",
    elements: row.elements.flatMap(asElement),
    createdAt: Date.now(),
    platform: typeof row.platform === "string" ? row.platform : process.platform
  }
}

function asElement(value: unknown): ObservationElement[] {
  if (!value || typeof value !== "object") return []
  const row = value as Record<string, unknown>
  if (typeof row.id !== "string" || typeof row.name !== "string") return []
  const element: ObservationElement = {
    id: row.id,
    role: typeof row.role === "string" ? row.role : "",
    name: row.name,
    clickable: row.clickable === true
  }
  if (typeof row.value === "string") element.value = row.value
  return [element]
}
