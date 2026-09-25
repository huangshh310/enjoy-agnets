/**
 * desktop_act：Allow 后解冻再 take；仍 stale 则同应用重拍一次再匹配。
 * 不匹配只回二次确认载荷，禁止对过期观察静默点击。
 */
import {
  DESKTOP_ACT_SECOND_CONFIRM,
  DESKTOP_ACT_STALE,
  desktopAppKey,
  matchResnapElement,
  resolveListedAppPid,
  type Observation,
  type ObservationLedger,
  type ResnapTarget
} from "@enjoy-agents/agent-core/computer-use"
import type { ActInput, DesktopSessionHooks } from "./desktop-session.types.ts"
import { forgetSecondConfirm, refuseSecondConfirmAct, rememberSecondConfirm } from "./desktop-second-confirm.ts"
import { rememberSnapshot, type SessionCall } from "./desktop-session-snapshot.ts"

const RESTORE_CODES = new Set([
  "needs_foreground",
  "integrity_blocked",
  "unknown_key",
  "no_display",
  "executor_missing",
  "permission_denied"
])

export async function actOnce(
  call: SessionCall,
  ledger: ObservationLedger,
  input: ActInput,
  hooks: DesktopSessionHooks
) {
  const blocked = refuseSecondConfirmAct(input, ledger.lookup(input.observationId)?.thumbnailPath)
  if (blocked) return blocked
  ledger.unfreeze(input.observationId)
  const taken = ledger.take(input.observationId)
  if (taken.ok) return deliverAct(call, ledger, taken.observation, input, hooks)
  if (taken.cause === "spent") return { success: false, code: taken.code }
  return recoverStaleAct(call, ledger, input, hooks)
}

async function deliverAct(
  call: SessionCall,
  ledger: ObservationLedger,
  observation: Observation,
  input: ActInput,
  hooks: DesktopSessionHooks
) {
  forgetSecondConfirm(input.observationId)
  forgetSecondConfirm(observation.id)
  hooks.onAct?.(input, observation)
  let acted: Record<string, unknown>
  try {
    acted = await call("act", actParams(observation, input))
  } finally {
    hooks.onActEnd?.(input, observation)
  }
  if (acted.success !== true) {
    if (RESTORE_CODES.has(String(acted.code))) ledger.put(observation)
    return acted
  }
  const next = await rememberSnapshot(call, ledger, observation.pid, hooks)
  if (next.success === true) return { ...acted, observationId: next.observationId }
  return acted
}

async function recoverStaleAct(
  call: SessionCall,
  ledger: ObservationLedger,
  input: ActInput,
  hooks: DesktopSessionHooks
) {
  const previous = ledger.lookup(input.observationId)
  const target = resnapTarget(previous, input)
  const pid = await resolveResnapPid(call, target)
  if (pid == null) return staleResult(input)
  const snapped = await rememberSnapshot(call, ledger, pid, hooks)
  if (snapped.success !== true) return staleResult(input, snapped)
  return actResnapOrConfirm(call, ledger, input, hooks, snapped, previous)
}

async function actResnapOrConfirm(
  call: SessionCall,
  ledger: ObservationLedger,
  input: ActInput,
  hooks: DesktopSessionHooks,
  snapped: Record<string, unknown>,
  previous: Observation | null
) {
  const nextId = String(snapped.observationId ?? "")
  const next = ledger.lookup(nextId)
  const matched = next ? matchResnapElement(next, resnapTarget(previous, input)) : null
  if (!next || !matched) {
    if (next) ledger.freeze(next.id)
    return next ? secondConfirmResult(previous, next, input) : staleResult(input)
  }
  const taken = ledger.take(next.id)
  if (!taken.ok) return staleResult(input)
  return deliverAct(call, ledger, taken.observation, { ...input, observationId: next.id, elementId: matched.id }, hooks)
}

async function resolveResnapPid(call: SessionCall, target: ResnapTarget): Promise<number | undefined> {
  const listed = await call("list_apps", {})
  const fromList = listed.success === true ? resolveListedAppPid(listed, target) : undefined
  if (fromList) return fromList
  return typeof target.pid === "number" && target.pid > 0 ? target.pid : undefined
}

function resnapTarget(previous: Observation | null, input: ActInput): ResnapTarget {
  return {
    appKey: input.appKey || previous?.appKey || desktopAppKey(previous ?? { appName: input.appName }),
    appName: previous?.appName || input.appName,
    bundleId: previous?.bundleId,
    exe: previous?.exe,
    aumid: previous?.aumid,
    pid: typeof input.pid === "number" ? input.pid : previous?.pid,
    elementId: input.elementId,
    elementRole: input.elementRole || findRole(previous, input.elementId),
    elementName: input.elementName || findName(previous, input.elementId)
  }
}

function actParams(observation: Observation, input: ActInput): Record<string, unknown> {
  const element = observation.elements.find((item) => item.id === input.elementId)
  const key = input.key
    ? input.key.replace(/(^|\+)mod(?=\+|$)/gi, `$1${observation.platform === "darwin" ? "cmd" : "ctrl"}`)
    : input.key
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

function staleResult(input: ActInput, snapped?: Record<string, unknown>) {
  return {
    success: false,
    code: DESKTOP_ACT_STALE,
    observationId: input.observationId,
    ...(snapped?.code ? { resnapCode: snapped.code } : {})
  }
}

function secondConfirmResult(previous: Observation | null, next: Observation, input: ActInput) {
  const previousThumbnailPath = previous?.thumbnailPath ?? input.thumbnailPath
  rememberSecondConfirm({
    observationId: next.id,
    previousObservationId: previous?.id ?? input.observationId,
    previousThumbnailPath,
    previousAppName: previous?.appName ?? input.appName,
    previousElementName: input.elementName
  })
  return {
    success: false,
    code: DESKTOP_ACT_SECOND_CONFIRM,
    observationId: next.id,
    previousObservationId: previous?.id ?? input.observationId,
    previousThumbnailPath,
    thumbnailPath: next.thumbnailPath,
    appName: next.appName,
    previousAppName: previous?.appName ?? input.appName,
    elementName: input.elementName,
    previousElementName: input.elementName,
    message: "Observation expired. Resnapshot did not match the approved target."
  }
}

function findRole(previous: Observation | null, elementId?: string): string | undefined {
  return previous?.elements.find((item) => item.id === elementId)?.role
}

function findName(previous: Observation | null, elementId?: string): string | undefined {
  return previous?.elements.find((item) => item.id === elementId)?.name
}
