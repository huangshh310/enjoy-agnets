/**
 * desktop_act 稳定失败码。审批闸与 actOnce 共用，禁止各写一套字符串。
 * renderer 只认码，文案归 mike / luna。
 */
export const DESKTOP_ACT_BARE_COORDS_DISABLED = "bare_coords_disabled"
export const DESKTOP_ACT_ACTION_FAILED = "action_failed"

/** 执行面与审批硬拒落到 `tool.result.result` 的同一形状。 */
export function desktopActBareCoordsDeniedResult(): {
  success: false
  code: typeof DESKTOP_ACT_BARE_COORDS_DISABLED
} {
  return { success: false, code: DESKTOP_ACT_BARE_COORDS_DISABLED }
}

/** 从审批决策 / SDK part / tool.result 读出裸坐标硬拒码。 */
export function readDesktopActBareCoordsDeniedCode(value: unknown): string | undefined {
  if (value === DESKTOP_ACT_BARE_COORDS_DISABLED) return DESKTOP_ACT_BARE_COORDS_DISABLED
  if (!value || typeof value !== "object") return undefined
  const row = value as Record<string, unknown>
  const approval = asRecord(row.approval)
  const nested = [row.result, row.output, row.payload].map(asRecord)
  const candidates = [
    row.code,
    row.reason,
    row.error,
    row.errorText,
    approval.reason,
    approval.requestReason,
    approval.code,
    ...nested.map((item) => item.code)
  ]
  return candidates.some((item) => item === DESKTOP_ACT_BARE_COORDS_DISABLED)
    ? DESKTOP_ACT_BARE_COORDS_DISABLED
    : undefined
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
