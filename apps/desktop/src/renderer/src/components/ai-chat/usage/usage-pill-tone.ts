/**
 * UsagePill 色阶：空会话降强调；≥85% 才拉警报。百分比只信 inspect。
 */
export type UsagePillTone = "alert" | "mid" | "low" | "quiet"

export const USAGE_PILL_ALERT_AT = 85

export function usagePillTone(percent: number, quiet: boolean): UsagePillTone {
  if (percent >= USAGE_PILL_ALERT_AT) return "alert"
  if (quiet) return "quiet"
  if (percent >= 50) return "mid"
  return "low"
}
