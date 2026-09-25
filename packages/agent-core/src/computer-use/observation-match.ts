/**
 * 重拍校验：同 appKey + 控件稳定键（id / role+name）。
 * 只做匹配，不实现 H2 会话 Allow。
 */
import type { Observation, ObservationElement } from "./observation-ledger.ts"

export const DESKTOP_ACT_STALE = "stale_observation"
export const DESKTOP_ACT_SECOND_CONFIRM = "needs_second_confirm"

export type ResnapTarget = {
  appKey?: string
  appName?: string
  bundleId?: string
  exe?: string
  aumid?: string
  pid?: number
  elementId?: string
  elementRole?: string
  elementName?: string
}

/** 白名单键优先级：bundleId → exe/AUMID → 规范化 appName。空串不能当匹配键。 */
export function desktopAppKey(input: ResnapTarget): string {
  const explicit = norm(input.appKey)
  if (explicit) return explicit
  const bundle = norm(input.bundleId)
  if (bundle) return bundle
  const win = norm(input.exe) || norm(input.aumid)
  if (win) return win
  return norm(input.appName)
}

export function elementStableKey(element: { id?: string; role?: string; name?: string }): string {
  const role = norm(element.role)
  const name = norm(element.name)
  if (role || name) return `${role}\u0000${name}`
  return norm(element.id)
}

/** 重拍树上找原目标。appKey 对不上或两边都空 → 不匹配。 */
export function matchResnapElement(next: Observation, target: ResnapTarget): ObservationElement | null {
  const wanted = desktopAppKey(target)
  const got = desktopAppKey(next)
  if (!wanted || !got || wanted !== got) return null
  const byId = target.elementId
    ? next.elements.find((item) => item.id === target.elementId)
    : undefined
  if (byId) return byId
  const role = norm(target.elementRole)
  const name = norm(target.elementName)
  if (!role && !name) return null
  return next.elements.find((item) => elementStableKey(item) === `${role}\u0000${name}`) ?? null
}

/** 从 list_apps 结果解析同应用 pid；对不上再回落 target.pid。 */
export function resolveListedAppPid(
  listed: Record<string, unknown>,
  target: ResnapTarget
): number | undefined {
  const apps = Array.isArray(listed.apps) ? listed.apps : []
  const wanted = desktopAppKey(target)
  for (const row of apps) {
    const pid = listedAppPid(row, wanted)
    if (pid != null) return pid
  }
  return typeof target.pid === "number" && target.pid > 0 ? target.pid : undefined
}

/** 重启 resume 不得把非 success 说成成功。 */
export function desktopActMayReportSuccess(result: Record<string, unknown> | null | undefined): boolean {
  return result?.success === true
}

export function desktopActFailureCode(result: Record<string, unknown> | null | undefined): string {
  if (result?.success === true) return ""
  const code = result && typeof result.code === "string" ? result.code.trim() : ""
  return code || DESKTOP_ACT_STALE
}

function listedAppPid(row: unknown, wanted: string): number | undefined {
  if (!row || typeof row !== "object") return undefined
  const rec = row as Record<string, unknown>
  const key = desktopAppKey({
    appKey: asText(rec.appKey),
    appName: asText(rec.name) || asText(rec.appName),
    bundleId: asText(rec.bundleId),
    exe: asText(rec.exe),
    aumid: asText(rec.aumid)
  })
  if (!wanted || key !== wanted || typeof rec.pid !== "number") return undefined
  return rec.pid > 0 ? rec.pid : undefined
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function norm(value?: string): string {
  return value?.trim().toLowerCase() ?? ""
}
