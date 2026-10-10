/**
 * Computer Use 宿主会话：观察编号在这里签发，执行器只负责点。
 * 不 import Electron，单测可以塞一个假执行器。
 */
import { createObservationLedger } from "@enjoy-agents/agent-core/computer-use"
import { actOnce } from "./desktop-session-act.ts"
import { doctorReport } from "./doctor-report.ts"
import { asRecord, failureOf, rememberSnapshot } from "./desktop-session-snapshot.ts"
import type { DesktopSession, DesktopSessionHooks } from "./desktop-session.types.ts"
import type { ExecutorHandle } from "./executor-client.ts"

export type { ActInput, DesktopPermissions, DesktopSession, DesktopSessionHooks } from "./desktop-session.types.ts"

type SessionCall = (method: string, params: Record<string, unknown>) => Promise<Record<string, unknown>>

/** 一个 Enjoy Local 会话共用的账本和执行器。 */
export function createDesktopSession(
  open: () => ExecutorHandle | null,
  hooks: DesktopSessionHooks = {}
): DesktopSession {
  const ledger = createObservationLedger({ now: hooks.now, ttlMs: hooks.ttlMs })
  let executor: ExecutorHandle | null = null
  const permissions = hooks.permissions ?? (() => ({ accessibility: false, screenCapture: false }))
  const client = () => (executor ??= open())
  const call: SessionCall = (method, params) => callExecutor(client, method, params)
  return {
    doctor: () => doctorReport(client(), permissions(), hooks),
    listApps: () => call("list_apps", {}),
    snapshot: (pid) => rememberSnapshot(call, ledger, pid, hooks),
    act: (input) => actOnce(call, ledger, input, hooks),
    screenshot: (pid) => hostScreenshot(pid, hooks),
    peek: (observationId) => ledger.peek(observationId),
    lookup: (observationId) => ledger.lookup(observationId),
    put: (observation) => ledger.put(observation),
    freeze: (observationId) => ledger.freeze(observationId),
    release: (observationId) => ledger.discard(observationId),
    cancelInFlight: () => executor?.cancelInFlight()
  }
}

async function hostScreenshot(pid: number | undefined, hooks: DesktopSessionHooks) {
  if (!hooks.captureThumb) return { success: false, code: "screenshot_unavailable" }
  const path = await hooks.captureThumb(pid)
  if (!path) return { success: false, code: "screenshot_unavailable" }
  return { success: true, thumbnailPath: path }
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
