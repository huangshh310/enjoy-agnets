/**
 * CU-P1-36 §3.6：裸坐标逃逸舱 + action_failed 诚实载荷。
 * 高级坐标默认关；失败不得附带可继续 act 的新观察。
 */
import {
  DESKTOP_ACT_ACTION_FAILED,
  DESKTOP_ACT_BARE_COORDS_DISABLED,
  desktopActBareCoordsDeniedResult,
  readDesktopActBareCoordsDeniedCode
} from "@enjoy-agents/ipc-contract/desktop-act-codes"
import { desktopActIsBareCoord } from "./desktop-act-policy.ts"

export {
  DESKTOP_ACT_ACTION_FAILED,
  DESKTOP_ACT_BARE_COORDS_DISABLED,
  desktopActBareCoordsDeniedResult
} from "@enjoy-agents/ipc-contract/desktop-act-codes"

export const DESKTOP_ACT_BARE_COORDS_DISABLED_REASON =
  "Bare pixel coordinates are disabled. Capture desktop_snapshot and act with elementId. Advanced coordinates is an escape hatch (default off)."

export type BareCoordsApprovalDenial = {
  type: "denied"
  reason: string
  code: typeof DESKTOP_ACT_BARE_COORDS_DISABLED
}

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

/** 审批闸硬拒：与 actOnce 同一码，带上 code 才能进 renderer。 */
export function denyBareDesktopCoordApproval(
  args: unknown,
  advancedOn: boolean
): BareCoordsApprovalDenial | null {
  if (!refuseBareDesktopCoord(args, advancedOn)) return null
  return {
    type: "denied",
    reason: DESKTOP_ACT_BARE_COORDS_DISABLED_REASON,
    code: DESKTOP_ACT_BARE_COORDS_DISABLED
  }
}

/**
 * SDK `tool-output-denied` → 现有 `tool.result`。
 * 裸坐标硬拒把码放进 `result.code`，与 actOnce 同一形状。
 */
export function streamPayloadForDeniedToolPart(part: Record<string, unknown>): {
  result?: { success: false; code: string }
  error: string
} {
  if (isBareCoordsDeniedPart(part)) {
    return {
      result: desktopActBareCoordsDeniedResult(),
      error: DESKTOP_ACT_BARE_COORDS_DISABLED
    }
  }
  return { error: "Denied" }
}

function isBareCoordsDeniedPart(part: Record<string, unknown>): boolean {
  if (readDesktopActBareCoordsDeniedCode(part) === DESKTOP_ACT_BARE_COORDS_DISABLED) return true
  const approval = asDeniedRecord(part.approval)
  const reason = [part.reason, part.error, part.errorText, approval.reason, approval.requestReason]
    .find((item) => typeof item === "string" && item.trim())
  if (reason === DESKTOP_ACT_BARE_COORDS_DISABLED_REASON) return true
  const name = String(part.toolName ?? asDeniedRecord(part.toolCall).toolName ?? "")
  const args = part.input ?? part.args ?? asDeniedRecord(part.toolCall).input ?? asDeniedRecord(part.toolCall).args
  return name === "desktop_act" && !reason && desktopActIsBareCoord(args)
}

function asDeniedRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
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
