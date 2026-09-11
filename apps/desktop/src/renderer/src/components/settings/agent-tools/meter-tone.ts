/**
 * 额度条颜色只走 pacing 判决，不跟 Used/Left 切换。
 * 对标 OpenUsage：蓝=匀速内，黄=将落在最后 10%，红=会提前烧完。
 */
import type { QuotaPacingStatus } from "@enjoy-agents/ipc-contract"

export function meterFillClass(status: QuotaPacingStatus | undefined): string {
  if (status === "danger" || status === "exhausted") return "bg-text-error-primary"
  if (status === "warning") return "bg-status-yellow-text"
  return "bg-accent-500"
}

export function meterNoteClass(status: QuotaPacingStatus | undefined): string {
  if (status === "danger" || status === "exhausted") return "text-text-error-primary"
  if (status === "warning") return "text-status-yellow-text"
  return "text-text-tertiary"
}
