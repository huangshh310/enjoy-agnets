/**
 * 闸判断前把账本观察身份并进 desktop_act 入参。
 * 观察字段覆盖模型自报，禁止把敏感应用降级成普通应用。
 */
import type { Observation } from "./observation-ledger.ts"
import { desktopActAppKey, desktopActIsSensitive } from "./desktop-act-app-key.ts"

export const DESKTOP_ACT_UNRESOLVED_OBSERVATION = "unresolvedObservation"

export type LookupDesktopObservation = (observationId: string) => Observation | null

export function observationIdFromDesktopActInput(input: unknown): string {
  if (!input || typeof input !== "object") return ""
  const id = (input as Record<string, unknown>).observationId
  return typeof id === "string" ? id.trim() : ""
}

/** 账本身份覆盖模型 app 字段；无稳键时删掉模型自报的 appKey。 */
export function bindObservationIdentityToDesktopActInput(
  args: Record<string, unknown>,
  observation: Observation
): Record<string, unknown> {
  const appKey = observation.appKey?.trim() || desktopActAppKey(observation)
  const next: Record<string, unknown> = {
    ...args,
    appName: observation.appName,
    bundleId: observation.bundleId,
    exe: observation.exe,
    aumid: observation.aumid,
    pid: observation.pid
  }
  if (appKey) next.appKey = appKey
  else delete next.appKey
  return next
}

/**
 * 有 lookup 且带 observationId：命中则并身份，未命中（未知/过期）标 unresolved。
 * 闸当时看不到执行面 stale_observation；未解析必须自己进 Dock，
 * 禁止 session-allow / 任意桌面 / 持久簿命中后再指望后续 stale。
 * 没 lookup 时保持原入参，兼容只测显式 app 字段的旧用例。
 */
export function prepareDesktopActGateInput(
  input: unknown,
  lookup?: LookupDesktopObservation
): unknown {
  const id = observationIdFromDesktopActInput(input)
  if (!id || !lookup || !input || typeof input !== "object") return input
  const observation = lookup(id)
  if (observation) return bindObservationIdentityToDesktopActInput(input as Record<string, unknown>, observation)
  return { ...(input as Record<string, unknown>), [DESKTOP_ACT_UNRESOLVED_OBSERVATION]: true }
}

export function desktopActHasUnresolvedObservation(args: unknown): boolean {
  return Boolean(
    args &&
      typeof args === "object" &&
      (args as Record<string, unknown>)[DESKTOP_ACT_UNRESOLVED_OBSERVATION] === true
  )
}

/**
 * allow_session / allow_always 落盘前再算一次（MUST，不是软降级）。
 * 观察并入后敏感，或观察号未解析：只当一次允许，不写会话表 / 簿。
 */
export function desktopGrantShouldPersist(
  args: unknown,
  lookup?: LookupDesktopObservation
): boolean {
  const judged = prepareDesktopActGateInput(args, lookup)
  if (desktopActHasUnresolvedObservation(judged)) return false
  return !desktopActIsSensitive(judged)
}
