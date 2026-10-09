/**
 * CU-P1-36 §3.6：裸坐标逃逸舱 + action_failed 诚实载荷。
 * 高级坐标默认关；失败不得附带可继续 act 的新观察。
 */
import { desktopActIsBareCoord } from "./desktop-act-policy.ts"

export const DESKTOP_ACT_BARE_COORDS_DISABLED = "bare_coords_disabled"
export const DESKTOP_ACT_ACTION_FAILED = "action_failed"

export const DESKTOP_ACT_BARE_COORDS_DISABLED_REASON =
  "Bare pixel coordinates are disabled. Capture desktop_snapshot and act with elementId. Advanced coordinates is an escape hatch (default off)."

/** 失败包里这些字段会被模型当成「下一步地图」。 */
const FAILURE_MAP_KEYS = [
  "observationId",
  "previousObservationId",
  "nextObservationId",
  "thumbnailPath",
  "thumbnailDataUrl",
  "previousThumbnailPath",
  "previousThumbnailDataUrl",
  "thumbnail",
  "elements",
  "nextElementId",
  "nextStep",
  "hint",
  "continueHint"
] as const

/** 高级坐标未开时，任一 x/y/x2/y2 硬拒（即使带 elementId）。 */
export function refuseBareDesktopCoord(
  args: unknown,
  advancedOn: boolean
): { success: false; code: string; message: string } | null {
  if (advancedOn === true || !desktopActIsBareCoord(args)) return null
  return {
    success: false,
    code: DESKTOP_ACT_BARE_COORDS_DISABLED,
    message: DESKTOP_ACT_BARE_COORDS_DISABLED_REASON
  }
}

/** action_failed 只保留失败事实，不签发/不附带下一步观察。 */
export function sanitizeDesktopActFailure(result: Record<string, unknown>): Record<string, unknown> {
  if (!isActionFailed(result)) return result
  const next: Record<string, unknown> = { success: false, code: DESKTOP_ACT_ACTION_FAILED }
  const message = typeof result.message === "string" ? result.message.trim() : ""
  if (message) next.message = message
  for (const key of FAILURE_MAP_KEYS) {
    if (key in next) delete next[key]
  }
  return next
}

/** 失败包不能当成功，也不能单独支撑下一次 act。 */
export function desktopActCanContinueFromFailure(result: Record<string, unknown> | null | undefined): boolean {
  if (!result || result.success === true) return false
  return !isActionFailed(result)
}

function isActionFailed(result: Record<string, unknown>): boolean {
  return result.code === DESKTOP_ACT_ACTION_FAILED
}
