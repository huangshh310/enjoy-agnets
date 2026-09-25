/**
 * 把执行器 snapshot 收进账本：签发编号、可选缩略图、通知右栏。
 */
import { randomBytes } from "node:crypto"
import type { Observation, ObservationElement, ObservationLedger } from "@enjoy-agents/agent-core/computer-use"
import { desktopAppKey } from "@enjoy-agents/agent-core/computer-use"
import { ExecutorFailure } from "./executor-client.ts"
import type { DesktopSessionHooks } from "./desktop-session.types.ts"

export type SessionCall = (method: string, params: Record<string, unknown>) => Promise<Record<string, unknown>>

export async function rememberSnapshot(
  call: SessionCall,
  ledger: ObservationLedger,
  pid: number | undefined,
  hooks: DesktopSessionHooks
) {
  const result = await call("snapshot", pid ? { pid } : {})
  if (result.success !== true) return result
  const observation = asObservation(result.observation, hooks.now)
  if (!observation) return { success: false, code: "bad_observation" }
  observation.id = `obs_${randomBytes(8).toString("hex")}`
  const thumb = hooks.captureThumb ? await hooks.captureThumb(observation.pid) : null
  if (thumb) observation.thumbnailPath = thumb
  observation.appKey = observation.appKey || desktopAppKey(observation)
  ledger.put(observation)
  hooks.onView?.({
    observationId: observation.id,
    appName: observation.appName,
    appKey: observation.appKey,
    elements: observation.elements,
    thumbnailPath: observation.thumbnailPath
  })
  return { success: true, observationId: observation.id, appName: observation.appName, elements: observation.elements }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

export function failureOf(error: unknown): { code: string; message: string } {
  if (error instanceof ExecutorFailure) return { code: error.code, message: error.message }
  return { code: "executor_error", message: error instanceof Error ? error.message : "executor_error" }
}

function asObservation(value: unknown, now?: () => number): Observation | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (!Array.isArray(row.elements)) return null
  const observation: Observation = {
    id: "pending",
    pid: typeof row.pid === "number" ? row.pid : 0,
    windowId: typeof row.windowId === "string" ? row.windowId : String(row.pid ?? ""),
    appName: typeof row.appName === "string" ? row.appName : "",
    elements: row.elements.flatMap(asElement),
    createdAt: now ? now() : Date.now(),
    platform: typeof row.platform === "string" ? row.platform : process.platform
  }
  copyOptional(observation, row, "thumbnailPath")
  copyOptional(observation, row, "appKey")
  copyOptional(observation, row, "bundleId")
  copyOptional(observation, row, "exe")
  copyOptional(observation, row, "aumid")
  return observation
}

function copyOptional(target: Observation, row: Record<string, unknown>, key: keyof Observation) {
  const value = row[key]
  if (typeof value === "string" && value) (target as Record<string, unknown>)[key] = value
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
