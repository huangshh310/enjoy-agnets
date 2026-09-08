/**
 * UsagePill 色阶：空会话一律 quiet（含 ≥85%）；有消息才走 M1 警报阶。
 */
export type UsagePillTone = "alert" | "mid" | "low" | "quiet"

export const USAGE_PILL_ALERT_AT = 85

export function usagePillTone(percent: number, quiet: boolean): UsagePillTone {
  if (quiet) return "quiet"
  if (percent >= USAGE_PILL_ALERT_AT) return "alert"
  if (percent >= 50) return "mid"
  return "low"
}
